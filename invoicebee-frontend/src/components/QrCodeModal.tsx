import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ProductDetail } from "../services/product";

interface QrCodeModalProps {
  product: ProductDetail;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ product, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const qrValue = product.qrToken || product.sku || product.id;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${product.sku}</title>
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
              border: 2px solid #000;
              padding: 16px;
              width: 260px;
              text-align: center;
              border-radius: 8px;
            }
            .name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .sku {
              font-size: 11px;
              color: #555;
              margin-bottom: 10px;
            }
            .scan-hint {
              font-size: 10px;
              color: #64748b;
              margin-top: 8px;
              letter-spacing: 0.05em;
              text-transform: uppercase;
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
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Product QR Sticker</h3>
            <p className="text-xs text-slate-500">Scan to view instant prices & details</p>
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
            className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center shadow-inner"
          >
            <div className="name max-w-[220px] truncate text-sm font-bold text-slate-900">{product.name}</div>
            <div className="sku text-xs text-slate-500">SKU: {product.sku}</div>

            <div className="my-3 rounded-lg bg-white p-2.5 shadow-sm">
              <QRCodeSVG
                value={qrValue}
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="scan-hint mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Scan to view live price
            </div>

            {product.hsnSac && (
              <div className="mt-1 text-[10px] text-slate-400">HSN: {product.hsnSac}</div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800"
            onClick={handlePrint}
          >
            Print Sticker
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
