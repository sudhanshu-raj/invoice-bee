import React, { useEffect, useState } from "react";
import { InvoiceJobStatus } from "../services/invoice";

interface InvoiceScanningOverlayProps {
  fileName?: string;
  filePreview?: string | null;
  status?: InvoiceJobStatus | null;
  onCancel?: () => void;
  cancelling?: boolean;
}

const fallbackMessages = [
  "Uploading document to parser...",
  "Reading text and table layout with OCR...",
  "Extracting items, rates, and tax breakdown...",
  "Matching with inventory catalogue...",
];

const statusToMessage: Record<InvoiceJobStatus, string> = {
  STARTED: "Initiating invoice scanning...",
  UPLOADED: "Document uploaded to processing queue...",
  PROCESSING: "Reading text and table layout with OCR...",
  EXTRACTED: "Extracting items, rates, and tax breakdown with AI...",
  POLISHED: "Matching with inventory catalogue...",
  COMPLETED: "Invoice parsed successfully!",
  SAVED: "Invoice saved to inventory!",
  FAILED: "Scanning failed. Please try again.",
  CANCELLED: "Scanning cancelled.",
};

const statusToProgress: Record<InvoiceJobStatus, number> = {
  STARTED: 15,
  UPLOADED: 30,
  PROCESSING: 55,
  EXTRACTED: 75,
  POLISHED: 90,
  COMPLETED: 100,
  SAVED: 100,
  FAILED: 100,
  CANCELLED: 100,
};

export const InvoiceScanningOverlay: React.FC<InvoiceScanningOverlayProps> = ({
  fileName = "Purchase Invoice",
  filePreview = null,
  status = null,
  onCancel,
  cancelling = false,
}) => {
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    if (status) return;
    const interval = setInterval(() => {
      setFallbackIndex((prev) => (prev + 1) % fallbackMessages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [status]);

  const currentMessage = status ? statusToMessage[status] : fallbackMessages[fallbackIndex];
  const progressPercent = status ? statusToProgress[status] : Math.min(25 + fallbackIndex * 22, 90);

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
            <div className="h-1.5 w-20 rounded bg-slate-200/60" />
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
        <p className="min-h-5 text-xs font-medium text-emerald-700 transition-opacity duration-300">
          {currentMessage}
        </p>
      </div>

      <div className="mt-5 w-56">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {status && (
          <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400">
            <span className={status === "UPLOADED" || status === "STARTED" ? "text-emerald-600" : ""}>Queue</span>
            <span className={status === "PROCESSING" ? "text-emerald-600" : ""}>OCR</span>
            <span className={status === "EXTRACTED" ? "text-emerald-600" : ""}>AI Structuring</span>
            <span className={status === "POLISHED" ? "text-emerald-600" : ""}>Catalog Match</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <span className="inline-block max-w-[240px] truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
          {fileName}
        </span>
        {onCancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {cancelling ? "Cancelling job " : "Cancel Scan"}
          </button>
        )}
      </div>
    </div>
  );
};
