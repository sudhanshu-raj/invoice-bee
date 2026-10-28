import os
import sys
import uvicorn
from fastapi import FastAPI

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PADDLE_OCR_DIR = os.path.join(BASE_DIR, "paddle-ocr")
WEB_SCRAPER_DIR = os.path.join(BASE_DIR, "web-scraper")

for service_dir in [PADDLE_OCR_DIR, WEB_SCRAPER_DIR]:
    if service_dir not in sys.path:
        sys.path.append(service_dir)

from ocr_router import router as ocr_router
from scraper_router import router as scraper_router

app = FastAPI(
    title="InvoiceBee Unified Services API",
    description="Unified API gateway for PaddleOCR and E-Commerce Web Scraper services."
)

app.include_router(ocr_router)
app.include_router(scraper_router)

@app.get("/health")
async def root_health():
    return {
        "status": "ok",
        "services": ["paddle-ocr", "web-scraper"]
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
