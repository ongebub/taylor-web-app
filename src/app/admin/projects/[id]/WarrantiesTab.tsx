"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Warranty {
  id: string;
  project_id: string;
  name: string;
  coverage_description: string | null;
  start_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  document_path: string | null;
}

interface WarrantyForm {
  name: string;
  coverage_description: string;
  start_date: string;
  expiry_date: string;
}

const emptyForm: WarrantyForm = {
  name: "",
  coverage_description: "",
  start_date: "",
  expiry_date: "",
};

export default function WarrantiesTab({
  projectId,
}: {
  projectId: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<WarrantyForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard against state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchWarranties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("warranties")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (!mountedRef.current) return;

      if (error) {
        console.error("[WarrantiesTab] Supabase error:", error);
        setError("Failed to load warranties");
      } else {
        setWarranties(data ?? []);
      }
    } catch (err) {
      console.error("[WarrantiesTab] Uncaught fetch error:", err);
      if (!mountedRef.current) return;
      setError("Failed to load warranties");
    }
    if (mountedRef.current) setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchWarranties();
  }, [fetchWarranties]);

  function startEdit(w: Warranty) {
    setEditingId(w.id);
    setForm({
      name: w.name,
      coverage_description: w.coverage_description ?? "",
      start_date: w.start_date ?? "",
      expiry_date: w.expiry_date ?? "",
    });
    setPdfFile(null);
    setFormErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setPdfFile(null);
    setFormErrors({});
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Product/Warranty name is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function uploadPdf(): Promise<{
    url: string;
    path: string;
  } | null> {
    if (!pdfFile) return null;

    const timestamp = Date.now();
    const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${projectId}/${timestamp}-${safeName}`;

    const { error } = await supabase.storage
      .from("warranty-docs")
      .upload(storagePath, pdfFile, { upsert: true });

    if (error) {
      throw new Error(`PDF upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("warranty-docs")
      .getPublicUrl(storagePath);

    return { url: urlData.publicUrl, path: storagePath };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setUploading(!!pdfFile);
    setError("");

    try {
      let docUrl: string | null = null;
      let docPath: string | null = null;

      if (pdfFile) {
        const result = await uploadPdf();
        if (!mountedRef.current) return;
        if (result) {
          docUrl = result.url;
          docPath = result.path;
        }
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        coverage_description: form.coverage_description.trim() || null,
        start_date: form.start_date || null,
        expiry_date: form.expiry_date || null,
      };

      // Only update document fields if a new file was uploaded
      if (docUrl) {
        payload.document_url = docUrl;
        payload.document_path = docPath;
      }

      if (editingId) {
        // If uploading a new PDF, delete the old one from storage
        if (docUrl) {
          const existing = warranties.find((w) => w.id === editingId);
          if (existing?.document_path) {
            await supabase.storage
              .from("warranty-docs")
              .remove([existing.document_path]);
          }
        }

        const { error } = await supabase
          .from("warranties")
          .update(payload)
          .eq("id", editingId);

        if (!mountedRef.current) return;
        if (error) {
          setError(error.message);
          setSaving(false);
          setUploading(false);
          return;
        }
      } else {
        const { error } = await supabase.from("warranties").insert({
          ...payload,
          project_id: projectId,
        });

        if (!mountedRef.current) return;
        if (error) {
          setError(error.message);
          setSaving(false);
          setUploading(false);
          return;
        }
      }

      setForm(emptyForm);
      setEditingId(null);
      setPdfFile(null);
      setFormErrors({});
      setSaving(false);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchWarranties();
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
      );
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleDelete(w: Warranty) {
    // Delete PDF from storage if it exists
    if (w.document_path) {
      const { error: storageError } = await supabase.storage
        .from("warranty-docs")
        .remove([w.document_path]);

      if (storageError) {
        console.error("[WarrantiesTab] Storage delete error:", storageError);
      }
    }

    const { error } = await supabase
      .from("warranties")
      .delete()
      .eq("id", w.id);

    if (!mountedRef.current) return;
    if (error) {
      setError(error.message);
      return;
    }
    if (editingId === w.id) cancelEdit();
    await fetchWarranties();
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString();
  }

  function getExpiryStatus(expiryDate: string | null): {
    label: string;
    className: string;
  } | null {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate + "T00:00:00");
    const daysUntil = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0)
      return { label: "Expired", className: "bg-red-100 text-red-700" };
    if (daysUntil <= 90)
      return {
        label: "Expiring Soon",
        className: "bg-yellow-100 text-yellow-700",
      };
    return { label: "Active", className: "bg-green-100 text-green-700" };
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Loading warranties...</p>
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

      {/* Add / Edit form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">
          {editingId ? "Edit Warranty" : "Add Warranty"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product / Warranty Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (formErrors.name)
                    setFormErrors((p) => {
                      const n = { ...p };
                      delete n.name;
                      return n;
                    });
                }}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition ${
                  formErrors.name ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="e.g. Malarkey Vista AR Shingles — Lifetime Limited"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Description
              </label>
              <textarea
                value={form.coverage_description}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    coverage_description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition resize-none"
                placeholder="Describe what the warranty covers..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiry_date: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Document (PDF)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPdfFile(file);
                }}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange/10 file:text-orange hover:file:bg-orange/20 file:cursor-pointer file:transition"
              />
              {editingId && !pdfFile && (
                <p className="mt-1 text-xs text-gray-400">
                  Leave empty to keep the existing document
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-orange hover:bg-orange/90 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {uploading
                ? "Uploading..."
                : saving
                  ? "Saving..."
                  : editingId
                    ? "Update Warranty"
                    : "Add Warranty"}
            </button>
          </div>
        </form>
      </div>

      {/* Warranties list */}
      {warranties.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No warranties yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Add one above to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warranties.map((w) => {
            const status = getExpiryStatus(w.expiry_date);
            return (
              <div
                key={w.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-navy truncate">
                      {w.name}
                    </h4>
                    {status && (
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(w)}
                      className="text-gray-400 hover:text-navy p-1 transition"
                      title="Edit"
                    >
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(w)}
                      className="text-gray-400 hover:text-red-600 p-1 transition"
                      title="Delete"
                    >
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
                    </button>
                  </div>
                </div>

                {/* Coverage description */}
                {w.coverage_description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-3">
                    {w.coverage_description}
                  </p>
                )}

                {/* Dates */}
                <div className="flex gap-4 text-xs text-gray-400 mb-3">
                  {w.start_date && (
                    <span>Start: {formatDate(w.start_date)}</span>
                  )}
                  {w.expiry_date && (
                    <span>Expires: {formatDate(w.expiry_date)}</span>
                  )}
                </div>

                {/* Document link */}
                {w.document_url && (
                  <div className="mt-auto pt-2 border-t border-gray-100">
                    <a
                      href={w.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:text-orange/80 transition"
                    >
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
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      View Document
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
