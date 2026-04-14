"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatFullAddress } from "@/lib/utils";
import { GOOGLE_REVIEW_URL } from "@/lib/config";
import PhotoGallery from "./PhotoGallery";
import ReferralSection from "./ReferralSection";

interface Project {
  id: string;
  slug: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  project_type: string;
  status: string;
  current_phase: string | null;
  start_date: string | null;
  estimated_completion: string | null;
  actual_completion: string | null;
  google_review_url: string | null;
  notes: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  order_index: number;
}

interface Photo {
  id: string;
  storage_path: string;
  public_url: string;
  phase: string;
  caption: string | null;
  order_index: number;
}

interface Warranty {
  id: string;
  name: string;
  coverage_description: string | null;
  start_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
}

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_path: string;
  created_at: string;
}

const PROGRESS_STAGES = [
  { key: "scheduled", label: "Scheduled" },
  { key: "materials", label: "Materials" },
  { key: "in_progress", label: "Work Started" },
  { key: "inspection", label: "Inspection" },
  { key: "complete", label: "Complete" },
];

function getActiveStageIndex(
  status: string,
  milestones: Milestone[]
): number {
  if (status === "complete") return 4;

  const hasMaterials = milestones.some(
    (m) =>
      m.completed_date &&
      m.title.toLowerCase().includes("material")
  );
  const hasAnyComplete = milestones.some((m) => m.completed_date);
  const hasInspection = milestones.some(
    (m) =>
      m.completed_date &&
      m.title.toLowerCase().includes("inspection")
  );

  if (hasInspection) return 3;
  if (status === "in_progress" || hasAnyComplete) {
    return hasMaterials ? 2 : 1;
  }
  return 0;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomerPortal({
  project,
  milestones,
  photos,
  warranties,
  documents,
}: {
  project: Project;
  milestones: Milestone[];
  photos: Photo[];
  warranties: Warranty[];
  documents: Document[];
}) {
  const [showAllMilestones, setShowAllMilestones] = useState(false);
  const activeStage = getActiveStageIndex(project.status, milestones);

  // Review button click tracking: persists per project slug in localStorage
  // so the thank-you + referral section stay visible on return visits.
  const reviewStorageKey = `review_clicked_${project.slug}`;
  const [reviewClicked, setReviewClicked] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(reviewStorageKey) === "true") {
        setReviewClicked(true);
      }
    } catch {
      // localStorage disabled — silent fallback
    }
  }, [reviewStorageKey]);

  function handleReviewClick() {
    try {
      localStorage.setItem(reviewStorageKey, "true");
    } catch {
      // ignore
    }
    setReviewClicked(true);
  }

  const address = formatFullAddress(
    project.street_address ?? "",
    project.city ?? "",
    project.state ?? "",
    project.zip ?? ""
  );

  const hasPhotos = photos.length > 0;
  const hasMilestones = milestones.length > 0;
  const hasWarranties = warranties.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── HEADER ── */}
      <header className="bg-navy">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <Image
              src="https://static.wixstatic.com/media/c8f2dc_45dae5be2cab45c1a964279915378377~mv2.png"
              alt="Taylor Exteriors & Construction"
              width={160}
              height={50}
              className="h-10 w-auto"
            />
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
              Your Project Portal
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {project.customer_name}
            </h1>
            {address && (
              <p className="text-sm text-white/70 mt-1">{address}</p>
            )}
            <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-orange/20 text-orange">
              {project.project_type}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* ── PROJECT STATUS ── */}
        <section>
          {project.status === "complete" && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4 flex items-center gap-3">
              <svg
                className="h-6 w-6 text-green-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-semibold text-green-800 text-sm">
                  Your project is complete!
                </p>
                {project.actual_completion && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Completed {formatDate(project.actual_completion)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-navy mb-5">
              Project Progress
            </h2>

            {/* Progress bar */}
            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-orange transition-all duration-500"
                style={{
                  width: `${(activeStage / (PROGRESS_STAGES.length - 1)) * 100}%`,
                }}
              />

              {/* Stage dots */}
              <div className="relative flex justify-between">
                {PROGRESS_STAGES.map((stage, i) => {
                  const isComplete = i <= activeStage;
                  const isCurrent = i === activeStage;
                  return (
                    <div
                      key={stage.key}
                      className="flex flex-col items-center"
                      style={{ width: "20%" }}
                    >
                      <div
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                          isComplete
                            ? "bg-orange border-orange text-white"
                            : "bg-white border-gray-300 text-gray-400"
                        } ${isCurrent ? "ring-4 ring-orange/20" : ""}`}
                      >
                        {isComplete && i < activeStage ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight ${
                          isComplete ? "text-navy" : "text-gray-400"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase & dates */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              {project.current_phase && (
                <p className="text-sm text-gray-700 mb-3">
                  <span className="font-medium text-navy">Current phase:</span>{" "}
                  {project.current_phase}
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                {project.start_date && (
                  <span>
                    Start date:{" "}
                    <span className="font-medium text-gray-700">
                      {formatDate(project.start_date)}
                    </span>
                  </span>
                )}
                {project.estimated_completion && (
                  <span>
                    Est. completion:{" "}
                    <span className="font-medium text-gray-700">
                      {formatDate(project.estimated_completion)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── MILESTONES ── */}
        {hasMilestones && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-4">Milestones</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
              <div className="space-y-0">
                {(showAllMilestones
                  ? milestones
                  : milestones.slice(0, 5)
                ).map((m, i) => {
                  const isCompleted = !!m.completed_date;
                  const isLast =
                    i ===
                    (showAllMilestones
                      ? milestones.length - 1
                      : Math.min(4, milestones.length - 1));
                  return (
                    <div key={m.id} className="flex gap-3">
                      {/* Timeline rail */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                            isCompleted
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {isCompleted && (
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[24px] ${
                              isCompleted ? "bg-green-300" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                        <p
                          className={`text-sm font-medium ${
                            isCompleted ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {m.description}
                          </p>
                        )}
                        <div className="flex gap-3 mt-1">
                          {m.completed_date && (
                            <span className="text-xs text-green-600 font-medium">
                              Completed {formatDate(m.completed_date)}
                            </span>
                          )}
                          {!m.completed_date && m.scheduled_date && (
                            <span className="text-xs text-gray-400">
                              Scheduled {formatDate(m.scheduled_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {milestones.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllMilestones((v) => !v)}
                  className="mt-4 text-sm font-medium text-orange hover:text-orange/80 transition"
                >
                  {showAllMilestones
                    ? "Show less"
                    : `Show all ${milestones.length} milestones`}
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── PHOTOS ── */}
        {hasPhotos && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-4">
              Project Photos
            </h2>
            <PhotoGallery photos={photos} />
          </section>
        )}

        {/* ── WARRANTIES ── */}
        {hasWarranties && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-4">Warranties</h2>
            <div className="space-y-3">
              {warranties.map((w) => {
                let statusBadge: {
                  label: string;
                  className: string;
                } | null = null;
                if (w.expiry_date) {
                  const daysUntil = Math.ceil(
                    (new Date(w.expiry_date + "T00:00:00").getTime() -
                      Date.now()) /
                      (1000 * 60 * 60 * 24)
                  );
                  if (daysUntil < 0) {
                    statusBadge = {
                      label: "Expired",
                      className: "bg-red-100 text-red-700",
                    };
                  } else if (daysUntil <= 90) {
                    statusBadge = {
                      label: "Expiring Soon",
                      className: "bg-yellow-100 text-yellow-700",
                    };
                  } else {
                    statusBadge = {
                      label: "Active",
                      className: "bg-green-100 text-green-700",
                    };
                  }
                }

                return (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-navy">
                          {w.name}
                        </h3>
                        {statusBadge && (
                          <span
                            className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        )}
                      </div>
                      {w.document_url && (
                        <a
                          href={w.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-orange hover:text-orange/80 transition"
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
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          View PDF
                        </a>
                      )}
                    </div>
                    {w.coverage_description && (
                      <p className="text-xs text-gray-500 mt-2">
                        {w.coverage_description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-400 mt-2">
                      {w.start_date && (
                        <span>Start: {formatDate(w.start_date)}</span>
                      )}
                      {w.expiry_date && (
                        <span>Expires: {formatDate(w.expiry_date)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── DOCUMENTS ── */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-4">Documents</h2>
          {documents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">
                Your project documents will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-navy truncate">
                      {d.name}
                    </h3>
                    {d.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                        {d.description}
                      </p>
                    )}
                  </div>
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:text-orange/80 transition self-start"
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
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                      />
                    </svg>
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── REVIEW + REFERRAL ── */}
        {project.status === "complete" && (
          <section className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
              {!reviewClicked ? (
                <>
                  <h2 className="text-lg font-bold text-navy mb-2">
                    Enjoying your new {project.project_type.toLowerCase()}?
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Reviews help local neighbors find a contractor they can
                    trust.
                  </p>
                  <a
                    href={GOOGLE_REVIEW_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleReviewClick}
                    className="inline-flex items-center gap-2 bg-orange hover:bg-orange/90 text-white font-semibold px-6 py-3 rounded-xl text-sm transition shadow-sm"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.5v-9l7 4.5-7 4.5z" />
                    </svg>
                    Leave Us a Google Review
                  </a>
                </>
              ) : (
                <>
                  <svg
                    className="h-10 w-10 text-green-500 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h2 className="text-lg font-bold text-navy mb-1">
                    Thank you!
                  </h2>
                  <p className="text-sm text-gray-500">
                    We appreciate you taking the time to leave a review.
                  </p>
                </>
              )}
            </div>

            {reviewClicked && (
              <ReferralSection
                projectId={project.id}
                referrerName={project.customer_name}
              />
            )}
          </section>
        )}

        {/* ── FOOTER ── */}
        <footer className="pt-4 pb-8 text-center space-y-4">
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              Taylor Exteriors & Construction &middot; Des Moines, IA
            </p>
            <p>
              <a
                href="tel:515-953-4000"
                className="hover:text-orange transition"
              >
                515-953-4000
              </a>
              {" · "}
              <a
                href="mailto:info@TaylorExt.com"
                className="hover:text-orange transition"
              >
                info@TaylorExt.com
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
