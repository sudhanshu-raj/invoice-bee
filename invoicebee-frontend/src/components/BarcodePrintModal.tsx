import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

export interface PrintQueueItem {
  sku: string;
  name: string;
  quantity: number;
}

interface BarcodePrintModalProps {
  queue: PrintQueueItem[];
  onClose: () => void;
  onUpdateQuantity: (sku: string, quantity: number) => void;
  onRemoveItem: (sku: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClearQueue: () => void;
}

function BarcodeSvg({ sku, width = 1.6, height = 46 }: { sku: string; width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && sku) {
      try {
        JsBarcode(svgRef.current, sku, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          font: "monospace",
          fontSize: 12,
          textMargin: 2,
          margin: 3,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (err) {
        try {
          JsBarcode(svgRef.current, sku, {
            width,
            height,
            displayValue: true,
            font: "monospace",
            fontSize: 12,
            textMargin: 2,
            margin: 3,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (ignored) {
        }
      }
    }
  }, [sku, width, height]);

  return <svg ref={svgRef} className="max-w-full" />;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  queue,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onReorder,
  onClearQueue,
}) => {
  const [layoutMode, setLayoutMode] = useState<24 | 30>(30);
  const [showCutBorders, setShowCutBorders] = useState(true);
  const [activePreviewPage, setActivePreviewPage] = useState(0);
  const [mobileTab, setMobileTab] = useState<"queue" | "preview">("queue");
  const previewRef = useRef<HTMLDivElement>(null);

  const labelsPerPage = layoutMode;
  const cols = 3;
  const rows = layoutMode === 30 ? 10 : 8;

  const expandedSkus: { sku: string; name: string }[] = [];
  queue.forEach((item) => {
    for (let i = 0; i < Math.max(1, item.quantity); i++) {
      expandedSkus.push({ sku: item.sku, name: item.name });
    }
  });

  const totalStickers = expandedSkus.length;
  const totalPages = Math.max(1, Math.ceil(totalStickers / labelsPerPage));

  useEffect(() => {
    if (activePreviewPage >= totalPages) {
      setActivePreviewPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, activePreviewPage]);

  const pagedList: { sku: string; name: string }[][] = [];
  for (let p = 0; p < totalPages; p++) {
    pagedList.push(expandedSkus.slice(p * labelsPerPage, (p + 1) * labelsPerPage));
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let sheetsHtml = "";
    pagedList.forEach((pageItems, pageIdx) => {
      let cardsHtml = "";
      pageItems.forEach((it) => {
        const dummySvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        try {
          JsBarcode(dummySvg, it.sku, {
            format: "CODE128",
            width: layoutMode === 30 ? 1.5 : 1.7,
            height: layoutMode === 30 ? 44 : 54,
            displayValue: true,
            font: "monospace",
            fontSize: 12,
            textMargin: 2,
            margin: 2,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (e) {
          try {
            JsBarcode(dummySvg, it.sku, {
              width: 1.5,
              height: 44,
              displayValue: true,
              font: "monospace",
              fontSize: 12,
              textMargin: 2,
              margin: 2,
              background: "#ffffff",
              lineColor: "#000000",
            });
          } catch (ignored) {}
        }

        const borderStyle = showCutBorders ? "border: 0.6px dashed #cbd5e1;" : "border: none;";
        cardsHtml += `
          <div class="barcode-card" style="${borderStyle}">
            ${dummySvg.outerHTML}
          </div>
        `;
      });

      sheetsHtml += `
        <div class="a4-sheet layout-${layoutMode}">
          ${cardsHtml}
        </div>
      `;
    });

    const rowHeight = layoutMode === 30 ? "26.5mm" : "33mm";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcodes - A4 Sheet</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 7mm 6mm;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-sheet {
              width: 198mm;
              height: 281mm;
              page-break-after: always;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-auto-rows: ${rowHeight};
              gap: 1.5mm;
              margin: 0 auto;
              align-content: start;
            }
            .a4-sheet:last-child {
              page-break-after: auto;
            }
            .barcode-card {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2px 4px;
              background: #ffffff;
              border-radius: 4px;
              overflow: hidden;
            }
            .barcode-card svg {
              max-width: 96%;
              max-height: 96%;
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${sheetsHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden max-h-[94vh] sm:max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-slate-50/70 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  A4 Label Sheet
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500">
                  {totalStickers} stickers ({totalPages} {totalPages === 1 ? "page" : "pages"})
                </span>
              </div>
              <h2 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900">
                Barcode Print Sheet
              </h2>
            </div>
            <button
              type="button"
              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 sm:hidden"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] sm:text-xs font-semibold">
              <button
                type="button"
                className={`rounded-md px-2 py-1 transition ${layoutMode === 30 ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                onClick={() => setLayoutMode(30)}
              >
                30 / sheet
              </button>
              <button
                type="button"
                className={`rounded-md px-2 py-1 transition ${layoutMode === 24 ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                onClick={() => setLayoutMode(24)}
              >
                24 / sheet
              </button>
            </div>

            <button
              type="button"
              className={`rounded-lg border px-2 py-1 text-[11px] sm:text-xs font-semibold transition ${showCutBorders ? "border-slate-300 bg-slate-100 text-slate-800" : "border-slate-200 bg-white text-slate-500"}`}
              onClick={() => setShowCutBorders(!showCutBorders)}
            >
              Cut Lines: {showCutBorders ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              className="hidden sm:grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex items-center border-b border-slate-200 bg-white px-2 lg:hidden">
          <button
            type="button"
            className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition ${mobileTab === "queue" ? "border-emerald-600 text-emerald-800" : "border-transparent text-slate-500"}`}
            onClick={() => setMobileTab("queue")}
          >
            Queue ({queue.length})
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition ${mobileTab === "preview" ? "border-emerald-600 text-emerald-800" : "border-transparent text-slate-500"}`}
            onClick={() => setMobileTab("preview")}
          >
            A4 Sheet Preview ({totalPages} {totalPages === 1 ? "page" : "pages"})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] flex-1 overflow-hidden min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <div className={`flex-col h-full min-h-0 bg-slate-50/40 ${mobileTab === "queue" ? "flex" : "hidden lg:flex"}`}>
            <div className="flex items-center justify-between border-b border-slate-100 p-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Queue Items ({queue.length})
              </span>
              {queue.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  onClick={onClearQueue}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {queue.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Print queue is empty. Click &quot;+ Print&quot; on any product in the catalogue to add barcodes here.
                </div>
              ) : (
                queue.map((item, idx) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          className="grid size-4 place-items-center rounded bg-slate-100 text-[10px] text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                          onClick={() => onReorder(idx, idx - 1)}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === queue.length - 1}
                          className="grid size-4 place-items-center rounded bg-slate-100 text-[10px] text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                          onClick={() => onReorder(idx, idx + 1)}
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 w-4 text-center">
                        {idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-slate-900 truncate">
                        {item.sku}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold"
                        onClick={() => onUpdateQuantity(item.sku, Math.max(1, item.quantity - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        className="w-10 rounded-lg border border-slate-200 bg-white py-0.5 text-center font-bold text-xs text-slate-900"
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.sku, Math.max(1, Number(e.target.value) || 1))}
                      />
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold"
                        onClick={() => onUpdateQuantity(item.sku, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="grid size-6 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 ml-1"
                        onClick={() => onRemoveItem(item.sku)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 p-2.5 bg-white text-xs text-slate-500 flex justify-between items-center">
              <span>Capacity per A4 page:</span>
              <span className="font-bold text-slate-800">{labelsPerPage} stickers</span>
            </div>
          </div>

          <div className={`flex-col h-full min-h-0 bg-slate-100/60 p-2 sm:p-4 ${mobileTab === "preview" ? "flex" : "hidden lg:flex"}`}>
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                {Array.from({ length: totalPages }).map((_, pIdx) => {
                  const countOnThisPage = pagedList[pIdx]?.length || 0;
                  const isFull = countOnThisPage === labelsPerPage;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 shrink-0 ${activePreviewPage === pIdx ? "bg-white text-slate-900 shadow-sm" : "bg-slate-200/80 text-slate-600 hover:bg-slate-200"}`}
                      onClick={() => setActivePreviewPage(pIdx)}
                    >
                      <span>Page {pIdx + 1}</span>
                      <span className={`rounded px-1 py-0.2 text-[9px] font-mono ${isFull ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {countOnThisPage}/{labelsPerPage}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="text-xs text-slate-500 hidden sm:inline">
                A4 Live Preview
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex justify-center p-1 sm:p-2">
              <div
                ref={previewRef}
                className="w-full max-w-[680px] bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 sm:p-4 min-h-[360px]"
              >
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5 text-[10px] sm:text-[11px] text-slate-400">
                  <span>A4 Sheet · Page {activePreviewPage + 1} of {totalPages}</span>
                  <span>{cols} cols × {rows} rows ({layoutMode} max)</span>
                </div>

                <div
                  className="grid gap-1.5 sm:gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  }}
                >
                  {(pagedList[activePreviewPage] || []).map((item, itIdx) => (
                    <div
                      key={`${item.sku}-${itIdx}`}
                      className={`flex items-center justify-center p-1 sm:p-1.5 rounded-lg bg-white overflow-hidden ${showCutBorders ? "border border-dashed border-slate-300" : "border border-transparent"}`}
                    >
                      <BarcodeSvg sku={item.sku} />
                    </div>
                  ))}

                  {Array.from({ length: Math.max(0, labelsPerPage - (pagedList[activePreviewPage]?.length || 0)) }).map((_, emptyIdx) => (
                    <div
                      key={`empty-${emptyIdx}`}
                      className="flex items-center justify-center h-12 sm:h-16 rounded-lg border border-dashed border-slate-200/80 text-[9px] text-slate-300 font-mono"
                    >
                      Slot {(pagedList[activePreviewPage]?.length || 0) + emptyIdx + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={totalStickers === 0}
              className="flex-1 sm:flex-initial rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 disabled:opacity-50"
              onClick={handlePrint}
            >
              Print {totalStickers} {totalStickers === 1 ? "Barcode" : "Barcodes"} on A4 ({totalPages} {totalPages === 1 ? "Sheet" : "Sheets"})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
