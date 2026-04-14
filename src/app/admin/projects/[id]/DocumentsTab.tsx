"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Document {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_path: string;
  created_at: string;
}

interface DocumentForm {
  name: string;
  description: string;
}

const emptyForm: DocumentForm = { name: "", description: "" };

const BUCKET = "customer-docs";

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const supabase = useMemo(() => createClient(), []);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!mountedRef.current) return;
    if (error) {
      setError("Failed to load documents");
    } else {
      setDocuments(data ?? []);
    }
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Document name is required";
    if (!file) errs.file = "Please choose a file";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");

    try {
      const safeName = file!.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${projectId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file!, {
          contentType: file!.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase.from("documents").insert({
        project_id: projectId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        file_url: urlData.publicUrl,
        file_path: storagePath,
      });

      if (insertError) {
        // Clean up storage if row insert failed
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw new Error(insertError.message);
      }

      if (!mountedRef.current) return;
      setForm(emptyForm);
      setFile(null);
      setFormErrors({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocuments();
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function handleDelete(doc: Document) {
    if (doc.file_path) {
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
    }
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", doc.id);

    if (!mountedRef.current) return;
    if (error) {
      setError(error.message);
      return;
    }
    await fetchDocuments();
  }

  function formatBytes(b?: number): string {
    if (!b && b !== 0) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Loading documents...</p>
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

      {/* Upload form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-navy mb-4">Upload Document</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Name <span className="text-red-500">*</span>
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
                placeholder="e.g. Signed Contract, Material Spec Sheet"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition resize-none"
                placeholder="Optional notes about this document..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (formErrors.file)
                    setFormErrors((p) => {
                      const n = { ...p };
                      delete n.file;
                      return n;
                    });
                }}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange/10 file:text-orange hover:file:bg-orange/20 file:cursor-pointer file:transition"
              />
              {file && (
                <p className="mt-1 text-xs text-gray-500">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
              {formErrors.file && (
                <p className="mt-1 text-xs text-red-600">{formErrors.file}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-orange hover:bg-orange/90 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {saving ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </form>
      </div>

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No documents yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Upload one above to share it with the customer
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">
                  Description
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">
                  Uploaded
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">
                    {d.name}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {d.description || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 hidden sm:table-cell">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-orange hover:text-orange/80 font-medium transition"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      className="text-sm text-gray-400 hover:text-red-600 font-medium transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
