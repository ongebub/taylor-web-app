"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Photo {
  id: string;
  public_url: string;
  phase: string;
  caption: string | null;
}

const PHASES = ["before", "during", "after"] as const;
const PHASE_LABELS: Record<string, string> = {
  before: "Before",
  during: "During",
  after: "After",
};

export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const availablePhases = PHASES.filter((p) =>
    photos.some((ph) => ph.phase === p)
  );
  const [activePhase, setActivePhase] = useState<string>(
    availablePhases[0] ?? "during"
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const phasePhotos = photos.filter((p) => p.phase === activePhase);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null ? (i + 1) % phasePhotos.length : null
    );
  }, [phasePhotos.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null
        ? (i - 1 + phasePhotos.length) % phasePhotos.length
        : null
    );
  }, [phasePhotos.length]);

  // Keyboard nav
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [lightboxIndex]);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        {/* Phase tabs */}
        {availablePhases.length > 1 && (
          <div className="flex gap-2 mb-5">
            {availablePhases.map((phase) => {
              const count = photos.filter((p) => p.phase === phase).length;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setActivePhase(phase)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    activePhase === phase
                      ? "bg-navy text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {PHASE_LABELS[phase]}
                  <span className="ml-1.5 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Photo grid */}
        {phasePhotos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No {PHASE_LABELS[activePhase]?.toLowerCase()} photos yet
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {phasePhotos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative aspect-square rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <Image
                  src={photo.public_url}
                  alt={photo.caption || "Project photo"}
                  fill
                  className="object-cover transition group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
                {photo.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                    <p className="text-[10px] sm:text-xs text-white leading-tight truncate">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && phasePhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 text-white/70 hover:text-white p-2 transition"
            aria-label="Close"
          >
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Prev / Next */}
          {phasePhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 sm:left-4 z-50 text-white/70 hover:text-white p-2 transition"
                aria-label="Previous"
              >
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 sm:right-4 z-50 text-white/70 hover:text-white p-2 transition"
                aria-label="Next"
              >
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={phasePhotos[lightboxIndex].public_url}
              alt={
                phasePhotos[lightboxIndex].caption || "Project photo"
              }
              width={1200}
              height={900}
              className="object-contain w-full h-auto max-h-[85vh] rounded-lg"
              priority
            />
            {phasePhotos[lightboxIndex].caption && (
              <p className="text-center text-sm text-white/80 mt-3">
                {phasePhotos[lightboxIndex].caption}
              </p>
            )}
            <p className="text-center text-xs text-white/40 mt-1">
              {lightboxIndex + 1} / {phasePhotos.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
