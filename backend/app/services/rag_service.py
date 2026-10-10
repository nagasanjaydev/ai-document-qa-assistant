import logging
from typing import List, Dict, Any, Optional
from backend.app.config import settings
from backend.app.database import get_chunks_collection, get_documents_collection
from backend.app.services.embedding_service import EmbeddingService
from backend.app.models.chat import SourceCitation

logger = logging.getLogger("backend.rag")


class RAGService:
    @staticmethod
    async def retrieve_chunks(
        query: str,
        user_id: str,
        doc_id: Optional[str] = None,
        top_k: int = 4,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        chunks_col = get_chunks_collection()
        docs_col = get_documents_collection()

        # Generate query embedding
        query_vector = await EmbeddingService.get_embedding(query, api_key=api_key)

        # Build mongo filter
        mongo_filter: Dict[str, Any] = {"user_id": user_id}
        if doc_id:
            mongo_filter["doc_id"] = doc_id

        # Retrieve candidate chunks
        cursor = chunks_col.find(mongo_filter)
        candidate_chunks = await cursor.to_list(length=1000)

        if not candidate_chunks:
            return []

        # Cache document filenames for fast lookup
        doc_names = {}
        for c in candidate_chunks:
            c_doc_id = c.get("doc_id")
            if c_doc_id and c_doc_id not in doc_names:
                doc_record = await docs_col.find_one({"$or": [{"_id": c_doc_id}, {"id": c_doc_id}]})
                doc_names[c_doc_id] = doc_record.get("filename", "Document") if doc_record else "Document"

        # Compute similarity scores
        scored_chunks = []
        for chunk in candidate_chunks:
            chunk_vec = chunk.get("embedding")
            if chunk_vec:
                score = EmbeddingService.cosine_similarity(query_vector, chunk_vec)
            else:
                score = 0.5  # default baseline if no embedding

            c_doc_id = chunk.get("doc_id", "")
            filename = doc_names.get(c_doc_id, "Document")

            scored_chunks.append({
                "chunk": chunk,
                "score": round(score, 4),
                "doc_id": c_doc_id,
                "filename": filename,
                "page_num": chunk.get("page_num", 1),
                "chunk_index": chunk.get("chunk_index", 0),
                "content": chunk.get("content", "")
            })

        # Sort descending by similarity
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    @staticmethod
    async def generate_grounded_response(
        query: str,
        retrieved_items: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        key = api_key or settings.GEMINI_API_KEY
        
        # Prepare citations
        citations = []
        for item in retrieved_items:
            snippet = item["content"]
            if len(snippet) > 280:
                snippet = snippet[:280] + "..."
            citations.append(SourceCitation(
                doc_id=item["doc_id"],
                filename=item["filename"],
                chunk_index=item["chunk_index"],
                page_num=item["page_num"],
                score=item["score"],
                snippet=snippet
            ))

        # Format context string
        if not retrieved_items:
            context_text = "No relevant document excerpts were found in your library."
        else:
            context_blocks = []
            for i, item in enumerate(retrieved_items):
                context_blocks.append(
                    f"[Source #{i+1}: {item['filename']} | Page: {item['page_num']} | Chunk: {item['chunk_index']}]\n"
                    f"{item['content']}"
                )
            context_text = "\n\n---\n\n".join(context_blocks)

        system_instruction = (
            "You are an expert AI Document QA Assistant. Your goal is to provide accurate, comprehensive, "
            "and context-grounded answers based strictly on the uploaded documents provided below.\n\n"
            "GUIDELINES:\n"
            "1. Ground your answers strictly in the provided document excerpts. Cite the specific source document and page/chunk when presenting facts.\n"
            "2. If the answer cannot be determined or found in the excerpts, clearly state: 'Based on the provided documents, I could not find information regarding this question.' Do not fabricate details.\n"
            "3. Format your response cleanly using GitHub-flavored Markdown (bullet points, bold text, code blocks or tables if appropriate).\n"
            "4. Be concise yet thorough and direct."
        )

        history_text = ""
        if history:
            turn_strings = []
            for h in history[-6:]:  # last 6 turns
                role = "User" if h.get("role") == "user" else "Assistant"
                turn_strings.append(f"{role}: {h.get('content', '')}")
            history_text = "\n".join(turn_strings)

        prompt = f"""DOCUMENT CONTEXT:
{context_text}

{"CONVERSATION HISTORY:" + chr(10) + history_text + chr(10) if history_text else ""}
USER QUESTION:
{query}

ANSWER (grounded in the document excerpts with clear citations):"""

        if key:
            try:
                from google import genai
                client = genai.Client(api_key=key)
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=f"{system_instruction}\n\n{prompt}",
                )
                if response and hasattr(response, "text") and response.text:
                    return {
                        "answer": response.text.strip(),
                        "citations": citations,
                        "model_used": settings.GEMINI_MODEL
                    }
            except Exception as e:
                logger.warning(f"google.genai call failed ({e}), trying google.generativeai...")
                try:
                    import google.generativeai as legacy_genai
                    legacy_genai.configure(api_key=key)
                    model = legacy_genai.GenerativeModel(
                        model_name=settings.GEMINI_MODEL,
                        system_instruction=system_instruction
                    )
                    res = model.generate_content(prompt)
                    if res and res.text:
                        return {
                            "answer": res.text.strip(),
                            "citations": citations,
                            "model_used": settings.GEMINI_MODEL
                        }
                except Exception as e2:
                    logger.error(f"Gemini API generation error: {e2}")

        # Resilient synthesis fallback when Gemini API key is missing or quota limited
        if not retrieved_items:
            fallback_answer = (
                "**No Matching Document Content Found**\n\n"
                "I couldn't find any relevant sections in your uploaded documents matching this query. "
                "Please make sure your files are uploaded and contain text related to your question."
            )
        else:
            top_source = retrieved_items[0]
            fallback_answer = (
                f"### Context Summary for: *{query}*\n\n"
                f"> **Note:** Gemini API key is not configured or reached quota limit. "
                f"Displaying semantic search retrieval results directly from your documents.\n\n"
                f"**Most Relevant Document:** `{top_source['filename']}` (Page {top_source['page_num']}, Relevance: {int(top_source['score']*100)}%)\n\n"
                f"**Key Excerpt:**\n"
                f"\"{top_source['content']}\"\n\n"
                f"---\n"
                f"*To enable conversational multi-turn generation with Google Gemini, add your `GEMINI_API_KEY` in the Settings panel.*"
            )

        return {
            "answer": fallback_answer,
            "citations": citations,
            "model_used": "semantic-retrieval-fallback" if not key else "gemini-fallback"
        }
