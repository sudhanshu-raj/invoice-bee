import React, { useEffect, useState } from "react";

interface InvoiceScanningOverlayProps {
  fileName?: string;
  filePreview?: string | null;
}

const statusMessages = [
  "Uploading document to parser...",
  "Reading text and table layout with OCR...",
  "Extracting items, rates, and tax breakdown...",
  "Matching with inventory catalogue...",
];

export const InvoiceScanningOverlay: React.FC<InvoiceScanningOverlayProps> = ({
  fileName = "Purchase Invoice",
  filePreview = null,
}) => {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="relative mb-6 flex items-center justify-center">
        <div className="relative flex h-40 w-32 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
          {filePreview ? (
            <img
              src={filePreview}
              alt="Invoice preview"
              className="absolute inset-0 size-full object-cover opacity-20"
            />
          ) : null}

          <div className="space-y-1.5">
            <div className="h-2.5 w-14 rounded bg-slate-200" />
            <div className="h-1.5 w-20 rounded bg-slate-150 bg-slate-200/60" />
          </div>

          <div className="space-y-2 py-2">
            <div className="flex justify-between gap-2">
              <div className="h-1.5 w-12 rounded bg-slate-200" />
              <div className="h-1.5 w-6 rounded bg-slate-200" />
            </div>
            <div className="flex justify-between gap-2">
              <div className="h-1.5 w-14 rounded bg-slate-200" />
              <div className="h-1.5 w-5 rounded bg-slate-200" />
            </div>
            <div className="flex justify-between gap-2">
              <div className="h-1.5 w-10 rounded bg-slate-200" />
              <div className="h-1.5 w-7 rounded bg-slate-200" />
            </div>
          </div>

          <div className="flex justify-between border-t border-slate-200 pt-2">
            <div className="h-2 w-8 rounded bg-slate-200" />
            <div className="h-2 w-7 rounded bg-emerald-300" />
          </div>

          <div className="clean-scan-line pointer-events-none absolute inset-x-0 z-10">
            <div className="h-0.5 w-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <div className="h-8 w-full bg-gradient-to-b from-emerald-500/15 to-transparent" />
          </div>
        </div>
      </div>

      <div className="max-w-xs space-y-2">
        <h3 className="text-base font-bold text-slate-900">
          Scanning invoice
        </h3>
        <p className="min-h-5 text-xs text-slate-500 transition-opacity duration-300">
          {statusMessages[statusIndex]}
        </p>
      </div>

      <div className="mt-5 w-48 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1.5 w-full animate-pulse rounded-full bg-emerald-500" />
      </div>

      <div className="mt-4">
        <span className="inline-block max-w-[240px] truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
          {fileName}
        </span>
      </div>
    </div>
  );
};
