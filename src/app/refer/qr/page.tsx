"use client";

import { useRef } from "react";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";

const REFER_URL = "https://taylor-web-app.vercel.app/refer";
const LOGO_URL =
  "https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png";

export default function ReferQRPage() {
  const qrRef = useRef<HTMLDivElement>(null);

  function handleDownload() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "taylor-exteriors-refer-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md w-full">
        {/* Logo */}
        <Image
          src={LOGO_URL}
          alt="Taylor Exteriors & Construction"
          width={240}
          height={85}
          priority
          className="mx-auto mb-10"
        />

        {/* QR Code */}
        <div ref={qrRef} className="inline-block bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
          <QRCodeCanvas
            value={REFER_URL}
            size={280}
            level="H"
            marginSize={2}
          />
        </div>

        {/* URL */}
        <p className="text-sm font-mono text-gray-500 mb-8 break-all">
          {REFER_URL}
        </p>

        {/* Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 bg-[#111111] hover:bg-[#333333] text-white font-semibold px-6 py-3 rounded-xl text-sm transition"
        >
          <svg
            className="h-5 w-5"
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
          Saves as taylor-exteriors-refer-qr.png
        </p>
      </div>
    </div>
  );
}
