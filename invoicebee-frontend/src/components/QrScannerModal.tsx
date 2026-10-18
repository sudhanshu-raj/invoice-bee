import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { fetchProductByQr, ProductDetail } from "../services/product";

interface QrScannerModalProps {
  onClose: () => void;
  onProductFound: (product: ProductDetail) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  onClose,
  onProductFound,
}) => {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStoppingRef = useRef<boolean>(false);

  const handleScanSuccess = async (decodedText: string) => {
    if (loading) return;
    setLoading(true);
    setError("");

    if (scannerRef.current && scannerRef.current.isScanning) {
      isStoppingRef.current = true;
      try {
        await scannerRef.current.stop();
        setCameraActive(false);
      } catch (ignored) {
      } finally {
        isStoppingRef.current = false;
      }
    }

    try {
      const product = await fetchProductByQr(decodedText.trim());
      onProductFound(product);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to resolve product details.");
      }
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setError("");
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader-container");
      }

      if (scannerRef.current.isScanning) {
        return;
      }

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
      };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        handleScanSuccess,
        () => {}
      );
      setCameraActive(true);
    } catch (err: unknown) {
      setCameraActive(false);
      if (err instanceof Error) {
        setError("Camera permission denied or camera unavailable. You can upload an image or enter the code manually.");
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        await scannerRef.current.stop();
        setCameraActive(false);
      } catch (ignored) {
      } finally {
        isStoppingRef.current = false;
      }
    }
  };

  const decodeWithJsQr = async (file: File): Promise<string> => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create canvas context");
    ctx.drawImage(bitmap, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const { default: jsQR } = await import("jsqr");
    let code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (code && code.data) {
      return code.data;
    }

    const scales = [0.5, 0.75, 1.5, 2.0];
    for (const scale of scales) {
      const sw = Math.floor(bitmap.width * scale);
      const sh = Math.floor(bitmap.height * scale);
      canvas.width = sw;
      canvas.height = sh;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bitmap, 0, 0, sw, sh);
      const scaledData = ctx.getImageData(0, 0, sw, sh);
      code = jsQR(scaledData.data, scaledData.width, scaledData.height, {
        inversionAttempts: "attemptBoth",
      });
      if (code && code.data) {
        return code.data;
      }
    }

    throw new Error("No QR code detected with jsQR");
  };

  const handleFileUpload = async (file: File) => {
    setError("");
    setLoading(true);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader-container");
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      if (decodedText && decodedText.trim()) {
        await handleScanSuccess(decodedText.trim());
        return;
      }
    } catch (primaryErr) {
    }

    try {
      const fallbackText = await decodeWithJsQr(file);
      if (fallbackText && fallbackText.trim()) {
        await handleScanSuccess(fallbackText.trim());
        return;
      }
    } catch (secondaryErr) {
    }

    setLoading(false);
    setError("Could not read a valid QR code from this image. Please upload a clear photo or type the code.");
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleScanSuccess(manualCode.trim());
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Scan Product QR Code</h3>
            <p className="text-xs text-slate-500">Scan to fetch pricing, margin & inventory</p>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="my-4 flex flex-col items-center">
          <div className="relative size-[260px] overflow-hidden rounded-2xl border-2 border-dashed border-emerald-500 bg-slate-900">
            <div id="qr-reader-container" className="size-full" />

            {!cameraActive && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 p-4 text-center text-white">
                <span className="text-xs font-semibold text-slate-300">Camera Inactive</span>
                <button
                  type="button"
                  className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                  onClick={startCamera}
                >
                  Enable Camera
                </button>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white">
                <div className="size-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="mt-3 text-xs font-semibold">Retrieving product prices…</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload QR Image File
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-2 text-[10px] font-bold text-slate-400 uppercase">
              or enter manually
            </span>
          </div>

          <form onSubmit={handleManualLookup} className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Enter SKU or QR UUID code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Lookup
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
