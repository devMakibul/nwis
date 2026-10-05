import base64
import io
from pathlib import Path

def get_document_images_base64(file_path: Path, mime_type: str) -> list[str]:
    """
    Convert a document into a list of base64-encoded JPEG strings.
    For PDF: Renders each page to an image.
    For Images: Converts directly.
    For DOCX: Currently unsupported for pure vision, returns empty list.
    """
    mt = mime_type.lower()
    b64_images = []

    if "pdf" in mt:
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(str(file_path))
            for i in range(len(pdf)):
                page = pdf[i]
                # Render at 150 DPI which is usually enough for OCR/Vision
                bitmap = page.render(scale=150/72)
                pil_image = bitmap.to_pil()
                # Convert to RGB to avoid alpha channel issues with JPEGs
                if pil_image.mode != "RGB":
                    pil_image = pil_image.convert("RGB")
                buf = io.BytesIO()
                pil_image.save(buf, format="JPEG", quality=85)
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                b64_images.append(b64)
        except Exception as e:
            print(f"Error rendering PDF: {e}")
            
    elif "image" in mt or mt.endswith(("png", "jpg", "jpeg", "tiff")):
        try:
            from PIL import Image
            img = Image.open(str(file_path))
            if img.mode != "RGB":
                img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
            b64_images.append(b64)
        except Exception as e:
            print(f"Error processing Image: {e}")

    return b64_images
