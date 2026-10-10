import os
import io
import logging
from typing import List, Dict, Any
import pypdf
import docx
from fastapi import HTTPException, status
from backend.app.core.config import settings

logger = logging.getLogger("backend.parser")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv"}


class DocumentParser:
    @staticmethod
    def validate_file(filename: str, file_bytes: bytes):
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{ext}'. Allowed extensions: PDF, DOCX, TXT, MD, CSV."
            )
        
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
            )

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)."
            )

    @staticmethod
    def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
        pages = []
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for i, page in enumerate(reader.pages):
                text = (page.extract_text() or "").strip()
                if text:
                    pages.append({"page_number": i + 1, "text": text})
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not read PDF file: {str(e)}"
            )

        if not pages:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="PDF appears to be empty or contains scanned images without selectable text."
            )
        return pages

    @staticmethod
    def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            
            # Extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_cells = [c.text.strip() for c in row.cells if c.text.strip()]
                    if row_cells:
                        paragraphs.append(" | ".join(row_cells))

            full_text = "\n\n".join(paragraphs).strip()
            if not full_text:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="DOCX file contains no readable text."
                )

            # Paginate approximately by 2000 characters
            approx_page_len = 2000
            pages = []
            for i in range(0, len(full_text), approx_page_len):
                page_text = full_text[i:i + approx_page_len].strip()
                if page_text:
                    pages.append({"page_number": (i // approx_page_len) + 1, "text": page_text})
            return pages
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error parsing DOCX: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse DOCX document: {str(e)}"
            )

    @staticmethod
    def parse_txt(file_bytes: bytes) -> List[Dict[str, Any]]:
        encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
        text = ""
        for enc in encodings:
            try:
                text = file_bytes.decode(enc).strip()
                break
            except UnicodeDecodeError:
                continue

        if not text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Text document is empty or could not be decoded."
            )

        approx_page_len = 2000
        pages = []
        for i in range(0, len(text), approx_page_len):
            chunk = text[i:i + approx_page_len].strip()
            if chunk:
                pages.append({"page_number": (i // approx_page_len) + 1, "text": chunk})
        return pages

    @classmethod
    def parse_document(cls, filename: str, file_bytes: bytes) -> List[Dict[str, Any]]:
        cls.validate_file(filename, file_bytes)
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            return cls.parse_pdf(file_bytes)
        elif ext in [".docx", ".doc"]:
            return cls.parse_docx(file_bytes)
        else:
            return cls.parse_txt(file_bytes)
