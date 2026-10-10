import re
from typing import List, Dict, Any


class TextChunker:
    def __init__(self, chunk_size: int = 700, chunk_overlap: int = 140):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def _split_into_sentences(self, text: str) -> List[str]:
        paragraphs = text.split("\n\n")
        sentences = []
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            parts = re.split(r'(?<=[.?!])\s+', p)
            for part in parts:
                cleaned = part.strip()
                if cleaned:
                    sentences.append(cleaned)
        return sentences

    def chunk_document(
        self,
        pages: List[Dict[str, Any]],
        document_id: str,
        owner_id: str
    ) -> List[Dict[str, Any]]:
        chunks = []
        global_idx = 0

        for page in pages:
            page_num = page.get("page_number", 1)
            raw_text = page.get("text", "").strip()
            if not raw_text:
                continue

            sentences = self._split_into_sentences(raw_text)
            if not sentences:
                continue

            current_chunk = []
            current_len = 0

            for sentence in sentences:
                sent_len = len(sentence)
                if current_len + sent_len > self.chunk_size and current_chunk:
                    chunk_text = " ".join(current_chunk).strip()
                    if chunk_text:
                        chunks.append({
                            "document_id": document_id,
                            "owner_id": owner_id,
                            "chunk_index": global_idx,
                            "page_number": page_num,
                            "chunk_text": chunk_text,
                            "char_count": len(chunk_text)
                        })
                        global_idx += 1

                    # Sliding window overlap
                    overlap_chunk = []
                    overlap_len = 0
                    for s in reversed(current_chunk):
                        if overlap_len + len(s) <= self.chunk_overlap:
                            overlap_chunk.insert(0, s)
                            overlap_len += len(s)
                        else:
                            break
                    current_chunk = overlap_chunk
                    current_len = overlap_len

                current_chunk.append(sentence)
                current_len += sent_len

            if current_chunk:
                chunk_text = " ".join(current_chunk).strip()
                if chunk_text:
                    chunks.append({
                        "document_id": document_id,
                        "owner_id": owner_id,
                        "chunk_index": global_idx,
                        "page_number": page_num,
                        "chunk_text": chunk_text,
                        "char_count": len(chunk_text)
                    })
                    global_idx += 1

        if not chunks:
            full_text = " ".join(p.get("text", "") for p in pages).strip()
            fallback_text = full_text[:self.chunk_size] if full_text else "[Empty document]"
            chunks.append({
                "document_id": document_id,
                "owner_id": owner_id,
                "chunk_index": 0,
                "page_number": 1,
                "chunk_text": fallback_text,
                "char_count": len(fallback_text)
            })

        return chunks
