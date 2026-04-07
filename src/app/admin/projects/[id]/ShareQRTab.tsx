"use client";

import { useState, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { APP_URL } from "@/lib/config";

export default function ShareQRTab({ slug }: { slug: string }) {
  const portalUrl = `${APP_URL}/project/${slug}`;
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = portalUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [portalUrl]);

  function handleDownloadQR() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${slug}-qr-code.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-6">
      {/* Portal URL section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">
          Customer Portal Link
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
            <p className="text-sm text-gray-700 truncate font-mono">
              {portalUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
              copied
                ? "bg-green-500 text-white"
                : "bg-orange hover:bg-orange/90 text-white"
            }`}
          >
            {copied ? (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR Code section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">QR Code</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div
            ref={qrRef}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <QRCodeCanvas
              value={portalUrl}
              size={200}
              level="H"
              marginSize={2}
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="inline-flex items-center gap-2 bg-navy hover:bg-navy/90 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                />
              </svg>
              Download QR Code
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Saves as {slug}-qr-code.png
            </p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-orange/5 border border-orange/20 rounded-xl p-5">
        <div className="flex gap-3">
          <svg
            className="h-5 w-5 text-orange flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-700">
            Share this link or print the QR code on customer paperwork. No login
            required — customers can view their project anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
