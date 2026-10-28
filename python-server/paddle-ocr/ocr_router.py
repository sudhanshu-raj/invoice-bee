import os
import site
import io
import numpy as np
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException
from paddleocr import PaddleOCR

cudnn_bin = os.path.join(site.getsitepackages()[1], "nvidia", "cudnn", "bin")
if os.path.exists(cudnn_bin):
    os.environ["PATH"] = cudnn_bin + os.pathsep + os.environ["PATH"]
    os.add_dll_directory(cudnn_bin)

router = APIRouter(prefix="/api/v1", tags=["PaddleOCR"])

ocr = PaddleOCR(
    ocr_version="PP-OCRv6",
    text_detection_model_name="PP-OCRv6_medium_det",
    text_recognition_model_name="PP-OCRv6_medium_rec",
    use_doc_orientation_classify=True,
    use_doc_unwarping=True,
    use_textline_orientation=True,
    device="gpu:0"
)

def build_structured_text(lines, y_threshold=18):
    if not lines:
        return ""
    
    sorted_lines = sorted(lines, key=lambda item: item["box"][0][1])
    
    rows = []
    current_row = [sorted_lines[0]]
    current_y = sorted_lines[0]["box"][0][1]
    
    for item in sorted_lines[1:]:
        y = item["box"][0][1]
        if abs(y - current_y) <= y_threshold:
            current_row.append(item)
        else:
            current_row.sort(key=lambda x: x["box"][0][0])
            rows.append(" | ".join(x["text"] for x in current_row))
            current_row = [item]
            current_y = y
            
    if current_row:
        current_row.sort(key=lambda x: x["box"][0][0])
        rows.append(" | ".join(x["text"] for x in current_row))
        
    return "\n".join(rows)

@router.post("/ocr")
async def extract_invoice_text(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image_np = np.array(image)

    results = ocr.predict(image_np)

    extracted_lines = []
    for res in results:
        texts = res.get("rec_texts", [])
        scores = res.get("rec_scores", [])
        polys = res.get("rec_polys", [])

        for text, score, poly in zip(texts, scores, polys):
            if float(score) < 0.65:
                continue
            box = poly.tolist() if hasattr(poly, "tolist") else poly
            extracted_lines.append({
                "text": text,
                "confidence": round(float(score), 4),
                "box": box
            })

    structured_text = build_structured_text(extracted_lines, y_threshold=18)

    return {
        "status": "success",
        "count": len(extracted_lines),
        "rawText": structured_text,
        "lines": extracted_lines
    }
