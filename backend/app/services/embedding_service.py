import os
import math
import hashlib
import logging
from typing import List, Optional
import numpy as np
from backend.app.config import settings

logger = logging.getLogger("backend.embeddings")


class EmbeddingService:
    @staticmethod
    def _fallback_embedding(text: str, dim: int = 256) -> List[float]:
        """
        Deterministic, normalized dense feature representation for offline/fallback use.
        Generates consistent semantic vector representations based on word n-grams and hashing.
        """
        vec = np.zeros(dim, dtype=np.float32)
        words = text.lower().split()
        if not words:
            return vec.tolist()

        # Word unigrams and character trigrams
        for word in words:
            # Hash word
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if ((h >> 8) % 2 == 0) else -1.0
            vec[idx] += sign

            # Character trigrams for morphological similarity
            if len(word) >= 3:
                for i in range(len(word) - 2):
                    tri = word[i:i+3]
                    htri = int(hashlib.sha256(tri.encode("utf-8")).hexdigest(), 16)
                    idx_tri = htri % dim
                    vec[idx_tri] += 0.3 * (1.0 if ((htri >> 4) % 2 == 0) else -1.0)

        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        return vec.tolist()

    @classmethod
    async def get_embedding(cls, text: str, api_key: Optional[str] = None) -> List[float]:
        key = api_key or settings.GEMINI_API_KEY
        if key:
            try:
                # Try modern google.genai client
                from google import genai
                client = genai.Client(api_key=key)
                response = client.models.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    contents=text,
                )
                if hasattr(response, "embeddings") and response.embeddings:
                    return response.embeddings[0].values
                if hasattr(response, "embedding") and response.embedding:
                    return response.embedding.values
            except Exception as e:
                logger.warning(f"google.genai embedding failed ({e}), attempting google.generativeai...")
                try:
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=key)
                    res = legacy_genai.embed_content(
                        model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
                        content=text,
                        task_type="retrieval_document"
                    )
                    if "embedding" in res:
                        return res["embedding"]
                except Exception as e2:
                    logger.warning(f"Gemini API embedding unavailable: {e2}. Using fallback embedding.")

        return cls._fallback_embedding(text)

    @classmethod
    async def get_batch_embeddings(cls, texts: List[str], api_key: Optional[str] = None) -> List[List[float]]:
        key = api_key or settings.GEMINI_API_KEY
        if key:
            try:
                from google import genai
                client = genai.Client(api_key=key)
                embeddings = []
                # Process in batches of 10 to respect API guidelines
                batch_size = 10
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    response = client.models.embed_content(
                        model=settings.GEMINI_EMBEDDING_MODEL,
                        contents=batch,
                    )
                    if hasattr(response, "embeddings"):
                        embeddings.extend([e.values for e in response.embeddings])
                    else:
                        break
                if len(embeddings) == len(texts):
                    return embeddings
            except Exception as e:
                logger.warning(f"Batch embedding with Gemini failed: {e}. Generating fallback embeddings.")

        return [cls._fallback_embedding(t) for t in texts]

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b:
            return 0.0
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        if len(a) != len(b):
            # If dimensions differ, truncate to common dimension
            min_dim = min(len(a), len(b))
            a = a[:min_dim]
            b = b[:min_dim]
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a < 1e-6 or norm_b < 1e-6:
            return 0.0
        similarity = float(np.dot(a, b) / (norm_a * norm_b))
        return max(0.0, min(1.0, (similarity + 1.0) / 2.0))  # normalize to 0..1 scale
