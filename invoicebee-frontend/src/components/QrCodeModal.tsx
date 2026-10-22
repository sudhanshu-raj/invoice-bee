import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { ProductDetail } from "../services/product";

interface QrCodeModalProps {
  product: ProductDetail;
  onClose: () => void;
  onAddToPrintQueue?: (product: ProductDetail) => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ product, onClose, onAddToPrintQueue }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [added, setAdded] = useState(false);
  const skuValue = (product.sku || product.id || "").trim();

  useEffect(() => {
    if (barcodeRef.current && skuValue) {
      try {
        JsBarcode(barcodeRef.current, skuValue, {
          format: "CODE128",
          width: 2,
          height: 68,
          displayValue: true,
          font: "monospace",
          fontSize: 14,
          textMargin: 6,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (err) {
        try {
          JsBarcode(barcodeRef.current, skuValue, {
            width: 2,
            height: 68,
            displayValue: true,
            font: "monospace",
            fontSize: 14,
            textMargin: 6,
            margin: 10,
            background: "#ffffff",
            lineColor: "#000000",
          });
        } catch (ignored) {
        }
      }
    }
  }, [skuValue]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode - ${skuValue}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .label {
              padding: 8px;
              text-align: center;
              display: inline-block;
            }
            svg {
              display: block;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${printContent}
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Product Barcode</h3>
            <p className="text-xs text-slate-500">Packaging barcode for SKU</p>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="my-6 flex flex-col items-center">
          <div
            ref={printRef}
            className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-3 shadow-inner max-w-full overflow-x-auto"
          >
            <svg ref={barcodeRef} className="max-w-full" />
          </div>
        </div>

        {onAddToPrintQueue && (
          <button
            type="button"
            className={`w-full mb-3 rounded-xl border py-2 text-xs font-bold transition shadow-sm ${added ? "border-emerald-500 bg-emerald-600 text-white" : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
            onClick={() => {
              onAddToPrintQueue(product);
              setAdded(true);
              setTimeout(() => setAdded(false), 2000);
            }}
          >
            {added ? "Added to A4 Print Queue" : "+ Add to A4 Print Queue"}
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800"
            onClick={handlePrint}
          >
            Print Barcode
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
