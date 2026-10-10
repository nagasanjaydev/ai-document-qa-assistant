import re
from typing import List, Dict, Any


class TextChunker:
    def __init__(self, chunk_size: int = 700, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def _split_into_sentences(self, text: str) -> List[str]:
        # Split on paragraph breaks first, then sentence boundaries
        paragraphs = text.split("\n\n")
        sentences = []
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            # Split by sentence ending punctuation while preserving sentences
            parts = re.split(r'(?<=[.?!])\s+', p)
            for part in parts:
                cleaned = part.strip()
                if cleaned:
                    sentences.append(cleaned)
        return sentences

    def chunk_document_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        global_chunk_idx = 0

        for page in pages:
            page_num = page.get("page_num", 1)
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
                            "chunk_index": global_chunk_idx,
                            "page_num": page_num,
                            "content": chunk_text,
                            "char_count": len(chunk_text)
                        })
                        global_chunk_idx += 1

                    # Retain overlap sentences
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
                        "chunk_index": global_chunk_idx,
                        "page_num": page_num,
                        "content": chunk_text,
                        "char_count": len(chunk_text)
                    })
                    global_chunk_idx += 1

        # Fallback if no chunks generated
        if not chunks:
            full_text = " ".join(p.get("text", "") for p in pages).strip()
            chunks.append({
                "chunk_index": 0,
                "page_num": 1,
                "content": full_text[:self.chunk_size] if full_text else "[No readable content]",
                "char_count": len(full_text[:self.chunk_size])
            })

        return chunks
