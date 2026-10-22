import React, { useState } from "react";
import { ProductDetail } from "../services/product";
import { askProductAi, enrichProductWeb, ProductWebIntelligence } from "../services/intelligence";

interface ProductPriceModalProps {
  product: ProductDetail;
  onClose: () => void;
  onShowQr: (product: ProductDetail) => void;
}

export const ProductPriceModal: React.FC<ProductPriceModalProps> = ({
  product,
  onClose,
  onShowQr,
}) => {
  const [tab, setTab] = useState<"price" | "details" | "ai">("price");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [webIntelligence, setWebIntelligence] = useState<ProductWebIntelligence | null>(null);
  const [loadingWeb, setLoadingWeb] = useState(false);

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
    } catch (err: any) {
    } finally {
      setLoadingWeb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  Scanned Product
                </span>
                <span className="text-xs font-mono font-medium text-slate-500">
                  {product.sku}
                </span>
              </div>
              <h2 className="mt-1.5 text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {product.name}
              </h2>
            </div>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
            <button
              type="button"
              className={`rounded-lg py-2 px-1 text-center text-xs font-bold transition ${tab === "price" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              onClick={() => setTab("price")}
            >
              <span className="sm:hidden">Pricing</span>
              <span className="hidden sm:inline">Pricing & Stock</span>
            </button>
            <button
              type="button"
              className={`rounded-lg py-2 px-1 text-center text-xs font-bold transition ${tab === "details" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              onClick={() => setTab("details")}
            >
              <span className="sm:hidden">Details</span>
              <span className="hidden sm:inline">More Details</span>
            </button>
            <button
              type="button"
              className={`rounded-lg py-2 px-1 text-center text-xs font-bold transition ${tab === "ai" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              onClick={() => {
                setTab("ai");
                if (!webIntelligence && !loadingWeb) {
                  handleFetchWebIntelligence();
                }
              }}
            >
              <span className="sm:hidden">AI & Web</span>
              <span className="hidden sm:inline">AI & Search</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {tab === "price" && (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-900">Effective Selling Price</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-emerald-700">
                        ₹{effectiveSelling.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm font-semibold text-slate-400 line-through">
                          ₹{Number(product.sellingPrice).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                  {hasDiscount && (
                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                      {discountPct}% OFF
                    </span>
                  )}
                </div>

                {product.mrp && product.mrp > effectiveSelling && (
                  <div className="mt-2 text-xs text-slate-500">
                    MRP: <span className="font-semibold text-slate-700">₹{Number(product.mrp).toLocaleString("en-IN")}</span> (Save ₹{(Number(product.mrp) - effectiveSelling).toLocaleString("en-IN")})
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Last Purchase Cost</span>
                  <div className="mt-1 text-sm font-bold text-slate-800">
                    ₹{cost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-400">Unit: {product.unit || "Nos"}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Gross Margin</span>
                  <div className="mt-1 text-sm font-bold text-emerald-700">
                    ₹{marginAmt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">
                    {marginPct > 0 ? `+${marginPct}% margin` : "0% margin"}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Current Stock</span>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {product.stock} {product.unit || "Nos"}
                  </div>
                  <span className={`text-[10px] font-bold ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {product.stock > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Category & Tax</span>
                  <div className="mt-1 text-sm font-bold text-slate-800 truncate">
                    {product.category || "General"}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {product.hsnSac ? `HSN: ${product.hsnSac}` : "No HSN code"}
                  </span>
                </div>
              </div>

              {product.pitchHook && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                  <div className="text-[11px] font-bold text-blue-900">Sales Pitch & Hook</div>
                  <p className="mt-1 text-xs text-blue-950 leading-relaxed">
                    {product.pitchHook}
                  </p>
                </div>
              )}
            </>
          )}

          {tab === "details" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Full Product Name</span>
                  <span className="font-semibold text-slate-800">{product.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Brand</span>
                  <span className="font-semibold text-slate-800">{product.brand || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Model / Variant</span>
                  <span className="font-semibold text-slate-800">{product.model || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Category</span>
                  <span className="font-semibold text-slate-800">{product.category || "General"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Unit of Measurement</span>
                  <span className="font-semibold text-slate-800">{product.unit || "PIECE"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">HSN / SAC Code</span>
                  <span className="font-mono font-semibold text-slate-800">{product.hsnSac || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Barcode / SKU</span>
                  <span className="font-mono font-semibold text-slate-800">{product.sku}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">QR Token ID</span>
                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[200px]">{product.qrToken || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  onClick={() => handleAskAi("Give me an engaging 2-sentence sales pitch for this product to say to the customer.")}
                >
                  Pitch to Customer
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => handleAskAi("What are the key benefits, ingredients/materials, and uses of this item?")}
                >
                  Key Benefits & Uses
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => handleAskAi("What is the typical Indian market retail price range and standard packaging for this?")}
                >
                  Market Price & Packaging
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Ask anything about this product or request a pitch..."
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAskAi()}
                />
                <button
                  type="button"
                  disabled={loadingAi || !aiQuestion.trim()}
                  className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 shrink-0"
                  onClick={() => handleAskAi()}
                >
                  {loadingAi ? "Thinking..." : "Ask AI"}
                </button>
              </div>

              {loadingAi && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-center text-xs text-emerald-800">
                  Searching SearXNG and synthesizing AI intelligence for {product.name}...
                </div>
              )}

              {aiAnswer && !loadingAi && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">AI Assistant Response</div>
                  <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                    {aiAnswer}
                  </div>
                </div>
              )}

              {webIntelligence && webIntelligence.sources.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                  <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Web Sources (SearXNG)</div>
                  <div className="space-y-1.5">
                    {webIntelligence.sources.slice(0, 3).map((s, idx) => (
                      <a
                        className="block truncate text-xs text-blue-600 hover:underline"
                        href={s.url}
                        key={idx}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        • {s.title || s.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
          <button
            type="button"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => onShowQr(product)}
          >
            <span>View / Print Barcode</span>
          </button>

          <button
            type="button"
            className="flex-1 sm:flex-none rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 text-center"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

