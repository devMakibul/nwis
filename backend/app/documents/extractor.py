"""
Document Extraction Engine

Extracts real text content from uploaded documents:
- PDF: uses pdfplumber (best quality) or pypdf as fallback
- DOCX: uses python-docx
- Images: returns placeholder (OCR requires tesseract)

Converts page content to clean Markdown.
"""
from pathlib import Path
from typing import Optional


def extract_pdf(file_path: Path) -> list[dict]:
    """Extract pages from a PDF. Returns list of {page_number, text, markdown}."""
    pages = []
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                tables = page.extract_tables() or []
                md = _text_to_markdown(text, tables, i)
                pages.append({"page_number": i, "raw_text": text, "markdown_content": md})
    except ImportError:
        # fallback to pypdf
        import pypdf
        reader = pypdf.PdfReader(str(file_path))
        for i, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            md = _text_to_markdown(text, [], i)
            pages.append({"page_number": i, "raw_text": text, "markdown_content": md})
    except Exception as e:
        pages.append({
            "page_number": 1,
            "raw_text": f"Extraction error: {e}",
            "markdown_content": f"> ⚠️ Extraction error: {e}",
        })
    return pages


def extract_docx(file_path: Path) -> list[dict]:
    """Extract content from a DOCX file. Returns single-page result with all content."""
    try:
        from docx import Document
        doc = Document(str(file_path))
        sections: list[str] = []
        tables_md: list[str] = []

        for block in doc.element.body:
            tag = block.tag.split("}")[-1] if "}" in block.tag else block.tag
            if tag == "p":
                from docx.oxml.ns import qn
                para_style = ""
                try:
                    para = [p for p in doc.paragraphs if p._p == block]
                    if para:
                        para_style = para[0].style.name or ""
                        text = para[0].text.strip()
                        if not text:
                            continue
                        if "Heading 1" in para_style:
                            sections.append(f"# {text}")
                        elif "Heading 2" in para_style:
                            sections.append(f"## {text}")
                        elif "Heading 3" in para_style:
                            sections.append(f"### {text}")
                        elif "List" in para_style:
                            sections.append(f"- {text}")
                        else:
                            sections.append(text)
                except Exception:
                    pass
            elif tag == "tbl":
                try:
                    tbl = [t for t in doc.tables if t._tbl == block]
                    if tbl:
                        rows = tbl[0].rows
                        if rows:
                            header = "| " + " | ".join(c.text.strip() for c in rows[0].cells) + " |"
                            sep = "| " + " | ".join("---" for _ in rows[0].cells) + " |"
                            body = "\n".join(
                                "| " + " | ".join(c.text.strip() for c in row.cells) + " |"
                                for row in rows[1:]
                            )
                            tables_md.append(f"{header}\n{sep}\n{body}")
                except Exception:
                    pass

        full_md = "\n\n".join(sections)
        if tables_md:
            full_md += "\n\n" + "\n\n".join(tables_md)

        # Split into pseudo-pages of ~50 paragraphs
        lines = full_md.split("\n")
        chunk_size = max(30, len(lines) // max(1, len(lines) // 60))
        pages = []
        page_num = 1
        for i in range(0, len(lines), chunk_size):
            chunk = "\n".join(lines[i:i + chunk_size])
            pages.append({
                "page_number": page_num,
                "raw_text": chunk,
                "markdown_content": chunk,
            })
            page_num += 1

        return pages if pages else [{"page_number": 1, "raw_text": "", "markdown_content": "*(empty document)*"}]
    except Exception as e:
        return [{"page_number": 1, "raw_text": f"Error: {e}", "markdown_content": f"> ⚠️ DOCX extraction error: {e}"}]


def extract_image(file_path: Path) -> list[dict]:
    """Images require OCR — return a placeholder note."""
    return [{
        "page_number": 1,
        "raw_text": "",
        "markdown_content": (
            f"> 🖼️ **Image Document:** `{file_path.name}`\n\n"
            "OCR extraction requires Tesseract or a cloud OCR service.\n"
            "Please extract the text manually or use a text-based PDF."
        ),
    }]


def extract_document(file_path: Path, mime_type: str) -> list[dict]:
    """Main dispatch: route to correct extractor based on mime type."""
    mt = mime_type.lower()
    if "pdf" in mt:
        return extract_pdf(file_path)
    elif "word" in mt or "docx" in mt or file_path.suffix.lower() == ".docx":
        return extract_docx(file_path)
    elif "image" in mt or mt.endswith(("png", "jpg", "jpeg", "tiff")):
        return extract_image(file_path)
    else:
        # Try PDF as last resort
        return extract_pdf(file_path)


def _text_to_markdown(text: str, tables: list, page_num: int) -> str:
    """Convert raw extracted text to clean Markdown."""
    if not text.strip() and not tables:
        return f"*(No text content on page {page_num})*"

    lines = text.split("\n")
    md_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            md_lines.append("")
            continue
        # Heuristic: ALL-CAPS short lines are likely headings
        if stripped.isupper() and len(stripped) < 80 and len(stripped) > 3:
            md_lines.append(f"## {stripped.title()}")
        # Lines ending with colon and short are sub-headings
        elif stripped.endswith(":") and len(stripped) < 50:
            md_lines.append(f"### {stripped}")
        else:
            md_lines.append(stripped)

    md = "\n".join(md_lines).strip()

    # Append extracted tables
    for tbl in tables:
        if not tbl or not tbl[0]:
            continue
        header_row = tbl[0]
        header = "| " + " | ".join(str(c or "").strip() for c in header_row) + " |"
        sep = "| " + " | ".join("---" for _ in header_row) + " |"
        rows = "\n".join(
            "| " + " | ".join(str(c or "").strip() for c in row) + " |"
            for row in tbl[1:]
        )
        md += f"\n\n{header}\n{sep}\n{rows}"

    return md
