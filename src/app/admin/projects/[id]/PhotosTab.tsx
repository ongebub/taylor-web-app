"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface Photo {
  id: string;
  storage_path: string;
  public_url: string;
  phase: string;
  caption: string | null;
  order_index: number;
}

interface UploadItem {
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const PHASES = ["before", "during", "after"] as const;
const PHASE_LABELS: Record<string, string> = {
  before: "Before",
  during: "During",
  after: "After",
};

export default function PhotosTab({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<string>("during");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true })
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.log("Error fetching photos:", error);
      setError("Failed to load photos");
    } else {
      setPhotos(data ?? []);
    }
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  async function uploadFile(file: File, index: number) {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${projectId}/${selectedPhase}/${timestamp}-${safeName}`;

    // Upload to storage with progress via XMLHttpRequest
    const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/project-photos/${storagePath}`;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    return new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) =>
            prev.map((u, i) => (i === index ? { ...u, progress: pct } : u))
          );
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from("project-photos")
            .getPublicUrl(storagePath);

          // Get current max order_index for this phase
          const phasePhotos = photos.filter((p) => p.phase === selectedPhase);
          const maxOrder = phasePhotos.length > 0
            ? Math.max(...phasePhotos.map((p) => p.order_index))
            : -1;

          // Insert record
          const { error: dbError } = await supabase.from("photos").insert({
            project_id: projectId,
            storage_path: storagePath,
            public_url: urlData.publicUrl,
            phase: selectedPhase,
            caption: null,
            order_index: maxOrder + 1,
          });

          if (dbError) {
            console.log("DB insert error:", dbError);
            setUploads((prev) =>
              prev.map((u, i) =>
                i === index
                  ? { ...u, status: "error", error: dbError.message }
                  : u
              )
            );
          } else {
            setUploads((prev) =>
              prev.map((u, i) =>
                i === index ? { ...u, status: "done", progress: 100 } : u
              )
            );
          }
        } else {
          setUploads((prev) =>
            prev.map((u, i) =>
              i === index
                ? { ...u, status: "error", error: `Upload failed (${xhr.status})` }
                : u
            )
          );
        }
        resolve();
      });

      xhr.addEventListener("error", () => {
        setUploads((prev) =>
          prev.map((u, i) =>
            i === index
              ? { ...u, status: "error", error: "Network error" }
              : u
          )
        );
        resolve();
      });

      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.send(file);
    });
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (fileArray.length === 0) return;

    setError("");
    const startIndex = uploads.length;
    const newUploads: UploadItem[] = fileArray.map((file) => ({
      file,
      progress: 0,
      status: "uploading",
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    await Promise.all(
      fileArray.map((file, i) => uploadFile(file, startIndex + i))
    );

    // Refresh photos and clear completed uploads
    await fetchPhotos();
    setUploads((prev) => prev.filter((u) => u.status === "error"));
  }

  async function handleDelete(photo: Photo) {
    setDeleting((prev) => new Set(prev).add(photo.id));

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("project-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      console.log("Storage delete error:", storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photo.id);

    if (dbError) {
      console.log("DB delete error:", dbError);
      setError("Failed to delete photo record");
    }

    setDeleting((prev) => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
    await fetchPhotos();
  }

  async function handleCaptionUpdate(photoId: string, caption: string) {
    const { error } = await supabase
      .from("photos")
      .update({ caption: caption || null })
      .eq("id", photoId);

    if (!error) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, caption: caption || null } : p))
      );
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Loading photos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">Upload Photos</h3>

        {/* Phase selector */}
        <div className="flex gap-2 mb-4">
          {PHASES.map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                selectedPhase === phase
                  ? "bg-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragOver
              ? "border-orange bg-orange/5"
              : "border-gray-300 hover:border-orange/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="text-gray-400">
            <svg
              className="mx-auto h-10 w-10 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
              />
            </svg>
            <p className="text-sm font-medium">
              Drag & drop {PHASE_LABELS[selectedPhase].toLowerCase()} photos
              here
            </p>
            <p className="text-xs mt-1">or click to browse</p>
          </div>
        </div>

        {/* Upload progress */}
        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploads.map((upload, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="truncate flex-1 text-gray-600">
                  {upload.file.name}
                </span>
                {upload.status === "uploading" && (
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange h-2 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === "done" && (
                  <span className="text-green-600 text-xs font-medium">
                    Done
                  </span>
                )}
                {upload.status === "error" && (
                  <span className="text-red-600 text-xs font-medium">
                    {upload.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo sections by phase */}
      {PHASES.map((phase) => {
        const phasePhotos = photos.filter((p) => p.phase === phase);
        return (
          <div key={phase}>
            <h3 className="text-lg font-semibold text-navy mb-3 flex items-center gap-2">
              {PHASE_LABELS[phase]}
              {phasePhotos.length > 0 && (
                <span className="text-xs font-normal text-gray-400">
                  ({phasePhotos.length})
                </span>
              )}
            </h3>
            {phasePhotos.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">
                  No {phase} photos uploaded yet
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {phasePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={photo.public_url}
                        alt={photo.caption || "Project photo"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(photo)}
                        disabled={deleting.has(photo.id)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                        title="Delete photo"
                      >
                        {deleting.has(photo.id) ? (
                          <svg
                            className="h-4 w-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Add caption..."
                        defaultValue={photo.caption ?? ""}
                        onBlur={(e) =>
                          handleCaptionUpdate(photo.id, e.target.value)
                        }
                        className="w-full text-xs text-gray-600 placeholder-gray-300 border-0 bg-transparent focus:outline-none focus:ring-0 p-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
