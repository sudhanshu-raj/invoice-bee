import React, { useState, useMemo } from "react";
import { ProductDetail } from "../services/product";
import { askProductAi, enrichProductWeb, ProductWebIntelligence } from "../services/intelligence";

interface ProductDetailsViewProps {
  product: ProductDetail;
  onBack: () => void;
  onEdit?: (product: ProductDetail) => void;
  onShowQr?: (product: ProductDetail) => void;
  onAddToPrintQueue?: (product: ProductDetail, qty?: number) => void;
}

export const ProductDetailsView: React.FC<ProductDetailsViewProps> = ({
  product,
  onBack,
  onEdit,
  onShowQr,
  onAddToPrintQueue,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "ai" | "sources">("overview");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [webIntelligence, setWebIntelligence] = useState<ProductWebIntelligence | null>(null);
  const [loadingWeb, setLoadingWeb] = useState(false);

  const parsedSpecs: Record<string, any> = useMemo(() => {
    if (!product.intelligenceSpecifications) return {};
    try {
      return JSON.parse(product.intelligenceSpecifications);
    } catch {
      return {};
    }
  }, [product.intelligenceSpecifications]);

  const sourceUrlsList: string[] = useMemo(() => {
    const urls: string[] = [];
    if (product.sourceUrls) {
      try {
        const parsed = JSON.parse(product.sourceUrls);
        if (Array.isArray(parsed)) {
          parsed.forEach((u) => {
            if (typeof u === "string" && u.trim() && !urls.includes(u.trim())) {
              urls.push(u.trim());
            }
          });
        }
      } catch {
      }
    }
    if (product.sourceUrl && !urls.includes(product.sourceUrl.trim())) {
      urls.unshift(product.sourceUrl.trim());
    }
    return urls;
  }, [product.sourceUrls, product.sourceUrl]);

  const effectiveSelling = Number(product.discountPrice || product.sellingPrice) || 0;
  const cost = Number(product.buyingPrice || product.lastPurchaseCost) || 0;
  const marginAmt = effectiveSelling - cost;
  const marginPct = cost > 0 ? Math.round((marginAmt / cost) * 100) : 0;
  const hasDiscount = product.discountPrice && product.discountPrice < product.sellingPrice;
  const discountPct = hasDiscount
    ? Math.round(((product.sellingPrice - (product.discountPrice || 0)) / product.sellingPrice) * 100)
    : 0;

  const handleAskAi = async (customQuery?: string) => {
    const q = customQuery !== undefined ? customQuery : aiQuestion;
    if (!q.trim()) return;
    setLoadingAi(true);
    try {
      const ans = await askProductAi(product.name, q);
      setAiAnswer(ans);
    } catch (err: any) {
      setAiAnswer(err.message || "Failed to retrieve AI response");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleFetchWebIntelligence = async () => {
    setLoadingWeb(true);
    try {
      const data = await enrichProductWeb(product.name);
      setWebIntelligence(data);
    } catch {
    } finally {
      setLoadingWeb(false);
    }
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const formatParagraphs = (text: string) => {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title="Back to products list"
          >
            <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                {product.category || "General"}
              </span>
              <span className="font-mono text-xs text-slate-500 font-medium">
                SKU: {product.sku}
              </span>
              {product.intelligenceStatus === "IN_PROGRESS" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 border border-rose-200 text-rose-700 text-[11px] font-bold">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-rose-500"></span>
                  </span>
                  Extracting Web Intelligence
                </span>
              )}
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {product.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onShowQr && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => onShowQr(product)}
            >
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8" />
              </svg>
              <span>Barcode / QR</span>
            </button>
          )}
          {onAddToPrintQueue && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => onAddToPrintQueue(product, 1)}
            >
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Add to Print</span>
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              onClick={() => onEdit(product)}
            >
              <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" />
              </svg>
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Selling Price
          </div>
          <div className="mt-1 text-xl font-extrabold text-emerald-700">
            ₹{effectiveSelling.toFixed(2)}
          </div>
          {hasDiscount && (
            <div className="mt-0.5 text-[11px] text-slate-400">
              <span className="line-through">₹{Number(product.sellingPrice).toFixed(2)}</span>
              <span className="ml-1 text-emerald-600 font-semibold">{discountPct}% OFF</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cost & Margin
          </div>
          <div className="mt-1 text-xl font-extrabold text-slate-800">
            {cost > 0 ? `₹${cost.toFixed(2)}` : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {cost > 0 ? (
              <span className={marginAmt >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                ₹{marginAmt.toFixed(2)} ({marginPct}%)
              </span>
            ) : (
              "No cost recorded"
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Stock Inventory
          </div>
          <div className="mt-1 text-xl font-extrabold text-slate-800">
            {Number(product.stock ?? 0)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {product.unit || "PIECE"}(s) available
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Brand & Model
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 truncate">
            {product.brand || "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">
            {product.model ? `Model: ${product.model}` : "Standard edition"}
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "overview"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Product Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("specs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "specs"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Specifications</span>
          {Object.keys(parsedSpecs).length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
              {Object.keys(parsedSpecs).length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "ai"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>AI Counter Assistant</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition shrink-0 ${
            activeTab === "sources"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Web Sources ({sourceUrlsList.length})</span>
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {(product.intelligencePitch || product.pitchHook) && (
              <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-emerald-50/20 p-5 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Sales Pitch & Customer Hook
                </div>
                <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-emerald-950 font-medium">
                  {formatParagraphs(product.intelligencePitch || product.pitchHook || "").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">
                Full Description
              </h2>
              {product.intelligenceDescription ? (
                <div className="space-y-3.5 text-sm leading-relaxed text-slate-700">
                  {formatParagraphs(product.intelligenceDescription).map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  No automated description extracted yet. Trigger web intelligence to auto-populate.
                </div>
              )}
            </div>

            {sourceUrlsList.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Discovered Web Sources ({sourceUrlsList.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sources")}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    View all
                  </button>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {sourceUrlsList.slice(0, 4).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40 hover:text-emerald-900 group"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white text-slate-400 shadow-2xs group-hover:text-emerald-700">
                        <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate text-slate-800 group-hover:text-emerald-950">
                          {getHostname(url)}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate">
                          {url}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                Identifiers & Codes
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">Full Name</span>
                  <span className="font-semibold text-slate-800 text-right">{product.name}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">SKU / Barcode</span>
                  <span className="font-mono font-semibold text-slate-800">{product.sku}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">HSN / SAC Code</span>
                  <span className="font-mono font-semibold text-slate-800">{product.hsnSac || "—"}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">MRP</span>
                  <span className="font-semibold text-slate-800">
                    {product.mrp ? `₹${Number(product.mrp).toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500 font-medium">QR Token</span>
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[150px]">
                    {product.qrToken || "—"}
                  </span>
                </div>
              </div>
            </div>

            {Object.keys(parsedSpecs).length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Key Specifications
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("specs")}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    View all ({Object.keys(parsedSpecs).length})
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {Object.entries(parsedSpecs).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 gap-2">
                      <span className="text-slate-500 font-medium shrink-0">{k}</span>
                      <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "specs" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Technical Specifications & Attributes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic attributes extracted from manufacturer listings and web intelligence
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              {Object.keys(parsedSpecs).length} Properties
            </span>
          </div>

          {Object.keys(parsedSpecs).length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(parsedSpecs).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {key}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-800 break-words leading-relaxed">
                    {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
              No technical specifications detected for this product. Run web intelligence to parse specs.
            </div>
          )}
        </div>
      )}

      {activeTab === "ai" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              AI Counter Sales Assistant
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask questions about ingredients, usage instructions, market price, or generate custom sales pitches.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
              onClick={() => handleAskAi("Give me an engaging 2-sentence sales pitch for this product to say to the customer.")}
            >
              Pitch to Customer
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              onClick={() => handleAskAi("What are the key benefits, ingredients/materials, and uses of this item?")}
            >
              Key Benefits & Uses
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              onClick={() => handleAskAi("What is the typical Indian market retail price range and standard packaging for this?")}
            >
              Market Price & Packaging
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Ask anything about this product or request a pitch..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
            />
            <button
              type="button"
              disabled={loadingAi || !aiQuestion.trim()}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 shrink-0"
              onClick={() => handleAskAi()}
            >
              {loadingAi ? "Thinking..." : "Ask AI"}
            </button>
          </div>

          {loadingAi && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6 text-center text-xs text-emerald-800">
              Synthesizing AI intelligence for {product.name}...
            </div>
          )}

          {aiAnswer && !loadingAi && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                AI Response
              </div>
              <div className="space-y-2 text-xs leading-relaxed text-slate-800">
                {formatParagraphs(aiAnswer).map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "sources" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Web Sources & Extracted URLs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Product pages crawled from SearXNG search results during data ingestion
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              disabled={loadingWeb}
              onClick={handleFetchWebIntelligence}
            >
              <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
              </svg>
              <span>{loadingWeb ? "Searching..." : "Re-search Web"}</span>
            </button>
          </div>

          {sourceUrlsList.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {sourceUrlsList.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between py-3.5 gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800">
                        {getHostname(url)}
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 hover:underline truncate block"
                      >
                        {url}
                      </a>
                    </div>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    title="Open external link"
                  >
                    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
              No web sources recorded. Trigger web search to capture product URLs.
            </div>
          )}

          {webIntelligence && webIntelligence.sources && webIntelligence.sources.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Live SearXNG Query Results
              </h3>
              <div className="divide-y divide-slate-100">
                {webIntelligence.sources.map((s, idx) => (
                  <div key={idx} className="py-2.5">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-emerald-700 hover:underline block truncate"
                    >
                      {s.title || s.url}
                    </a>
                    {s.content && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {s.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
