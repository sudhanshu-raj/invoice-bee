import os
import re
import json
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode, LLMConfig
from crawl4ai.extraction_strategy import LLMExtractionStrategy

os.environ["CRAWL4AI_NO_CLOUD_NOTICE"] = "1"

INDIAN_ECOMMERCE_PROMPT = """You are an expert product content extractor specialized in Indian e-commerce marketplaces including Amazon India, Flipkart, Meesho, Myntra, Nykaa, Reliance Digital, Tata CLiQ, and Croma.

Extract only the primary product content from the page into the requested JSON schema:
1. short_pitch: Generate a concise, high-impact 1-2 sentence marketing pitch summarizing the product identity and core value proposition.
2. full_description: Construct an exhaustive, clean, structured description covering key features, build quality, performance, usage details, and sales package contents. Omit all marketplace clutter such as user reviews, ratings, pin code delivery checkers, EMI options, bank card offers, seller terms, and navigation links.
3. specifications: Extract all technical details, dimensions, weight, connectivity, battery/power specs, warranty duration, and Country of Origin as clean key-value pairs formatted as a JSON object. Ensure keys are clean strings and values contain no irrelevant text."""

class ProductData(BaseModel):
    short_pitch: str = Field(description="A concise marketing pitch or 1-2 sentence hook highlighting key value proposition")
    full_description: str = Field(description="Comprehensive product description covering features, benefits, and details")
    specifications: Dict[str, Any] = Field(default_factory=dict, description="Key-value pairs of technical specifications, dimensions, materials, etc.")

class ScrapeRequest(BaseModel):
    url: str
    delay: float = 2.5
    wait_for: Optional[str] = None
    custom_instruction: Optional[str] = None
    bypass_cache: bool = True

class ProductResponse(BaseModel):
    status: str
    url: str
    data: ProductData

router = APIRouter(prefix="/api/v1/scraper", tags=["Product Scraper"])

def clean_extracted_payload(raw_content: Any) -> ProductData:
    if isinstance(raw_content, str):
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw_content.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip())
        try:
            raw_content = json.loads(cleaned)
        except Exception:
            raw_content = {}

    if isinstance(raw_content, list):
        filtered = [item for item in raw_content if isinstance(item, dict) and not item.get("error", False)]
        raw_content = filtered[0] if filtered else (raw_content[0] if raw_content and isinstance(raw_content[0], dict) else {})

    if not isinstance(raw_content, dict):
        raw_content = {}

    short_pitch = str(raw_content.get("short_pitch", "")).strip()
    full_description = str(raw_content.get("full_description", "")).strip()
    specifications = raw_content.get("specifications", {})

    if not isinstance(specifications, dict):
        specifications = {}

    cleaned_specs = {}
    for k, v in specifications.items():
        if k and v is not None:
            clean_k = str(k).strip()
            if isinstance(v, (dict, list)):
                cleaned_specs[clean_k] = v
            else:
                cleaned_specs[clean_k] = str(v).strip()

    if not short_pitch and full_description:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", full_description) if s.strip()]
        short_pitch = " ".join(sentences[:2]) if sentences else full_description[:160]

    if not full_description and short_pitch:
        full_description = short_pitch

    if not short_pitch:
        short_pitch = "Product information extracted from listing."

    if not full_description:
        full_description = "Detailed specifications and description extracted from product listing."

    return ProductData(
        short_pitch=short_pitch,
        full_description=full_description,
        specifications=cleaned_specs
    )

async def extract_product_content(
    url: str,
    delay: float = 2.5,
    wait_for: Optional[str] = None,
    custom_instruction: Optional[str] = None,
    bypass_cache: bool = True
) -> ProductData:
    llm_cfg = LLMConfig(
        provider="ollama/qwen2.5:7b-instruct",
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    instruction = custom_instruction if custom_instruction else INDIAN_ECOMMERCE_PROMPT
    strategy = LLMExtractionStrategy(
        llm_config=llm_cfg,
        schema=ProductData.model_json_schema(),
        instruction=instruction,
        force_json_response=True
    )
    browser_cfg = BrowserConfig(
        headless=True,
        viewport_width=1920,
        viewport_height=1080,
        extra_args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox"
        ]
    )
    run_cfg = CrawlerRunConfig(
        extraction_strategy=strategy,
        cache_mode=CacheMode.BYPASS if bypass_cache else CacheMode.ENABLED,
        delay_before_return_html=delay,
        wait_for=wait_for if wait_for else None,
        page_timeout=60000,
        wait_until="domcontentloaded",
        magic=True
    )
    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        result = await crawler.arun(url=url, config=run_cfg)
        if not result.success:
            raise HTTPException(
                status_code=502,
                detail=f"Crawling failed: {result.error_message}"
            )
        print("=== RAW CRAWL4AI SCRAPED MARKDOWN (FIRST 1500 CHARS) ===")
        print(result.markdown[:1500] if result.markdown else "None")
        print("=== RAW CRAWL4AI EXTRACTED CONTENT (BEFORE PROCESSING) ===")
        print(result.extracted_content)
        print("=== END RAW CONTENT ===")
        return clean_extracted_payload(result.extracted_content)

@router.get("/health")
async def scraper_health():
    return {"status": "ok", "service": "product-scraper", "model": "qwen2.5:7b-instruct"}

@router.post("/product", response_model=ProductResponse)
async def scrape_product(request: ScrapeRequest):
    if not request.url.startswith("http://") and not request.url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL scheme. Must start with http:// or https://")
    data = await extract_product_content(
        url=request.url,
        delay=request.delay,
        wait_for=request.wait_for,
        custom_instruction=request.custom_instruction,
        bypass_cache=request.bypass_cache
    )
    return ProductResponse(
        status="success",
        url=request.url,
        data=data
    )
