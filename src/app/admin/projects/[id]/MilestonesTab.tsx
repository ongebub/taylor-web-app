"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  order_index: number;
}

interface MilestoneForm {
  title: string;
  description: string;
  scheduled_date: string;
  completed_date: string;
}

const emptyForm: MilestoneForm = {
  title: "",
  description: "",
  scheduled_date: "",
  completed_date: "",
};

const PRESET_MILESTONES: Record<string, string[]> = {
  Roofing: [
    "Materials Delivered",
    "Tear-Off",
    "Underlayment",
    "Shingles Installed",
    "Flashing & Ridge Cap",
    "Final Inspection",
    "Cleanup & Walkthrough",
  ],
  Siding: [
    "Materials Delivered",
    "Prep & Removal",
    "Installation",
    "Trim & Finishing",
    "Inspection",
    "Cleanup & Walkthrough",
  ],
  "Windows & Doors": [
    "Materials Ordered",
    "Delivery & Prep",
    "Installation",
    "Trim & Sealing",
    "Final Inspection",
  ],
  Decking: [
    "Materials Delivered",
    "Demo & Prep",
    "Framing",
    "Decking Installed",
    "Railing & Finishing",
    "Final Walkthrough",
  ],
  "Storm Damage": [
    "Assessment",
    "Insurance Documentation",
    "Materials Delivered",
    "Repair Work",
    "Final Inspection",
    "Documentation Complete",
  ],
  Other: ["Project Start", "In Progress", "Final Inspection", "Complete"],
};

export default function MilestonesTab({
  projectId,
  projectType,
  onStatusChange,
}: {
  projectId: string;
  projectType: string;
  onStatusChange?: (status: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<MilestoneForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Guard against state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchMilestones = useCallback(async () => {
    console.log("[MilestonesTab] fetchMilestones called with projectId:", projectId);

    try {
      const { data, error } = await supabase
        .from("milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });

      console.log("[MilestonesTab] Query returned — data:", data?.length ?? "null", "error:", error, "mounted:", mountedRef.current);

      if (!mountedRef.current) return;

      if (error) {
        console.error("[MilestonesTab] Supabase error object:", JSON.stringify(error, null, 2));
        setError("Failed to load milestones");
      } else {
        console.log("[MilestonesTab] Fetched", data?.length ?? 0, "milestones");
        setMilestones(data ?? []);
      }
    } catch (err) {
      console.error("[MilestonesTab] Uncaught fetch error:", err);
      if (!mountedRef.current) return;
      setError("Failed to load milestones");
    }
    if (mountedRef.current) setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  async function updateProjectStatus(
    updatedMilestones: Milestone[],
    toggledTitle: string,
    wasCompleted: boolean
  ) {
    if (!mountedRef.current) return;
    const anyComplete = updatedMilestones.some((m) => m.completed_date);
    const isFinalInspection =
      toggledTitle.toLowerCase() === "final inspection";

    // Marking a milestone complete (not uncompleting)
    if (!wasCompleted) {
      if (isFinalInspection) {
        const today = new Date().toISOString().split("T")[0];
        const { error } = await supabase
          .from("projects")
          .update({ status: "complete", actual_completion: today })
          .eq("id", projectId);

        if (!error) onStatusChange?.("complete");
      } else if (anyComplete) {
        const { error } = await supabase
          .from("projects")
          .update({ status: "in_progress" })
          .eq("id", projectId);

        if (!error) onStatusChange?.("in_progress");
      }
    } else {
      // Uncompleting — if no milestones are complete, revert to scheduled
      // If Final Inspection was uncompleted, revert to in_progress
      if (isFinalInspection && anyComplete) {
        const { error } = await supabase
          .from("projects")
          .update({ status: "in_progress", actual_completion: null })
          .eq("id", projectId);

        if (!error) onStatusChange?.("in_progress");
      } else if (!anyComplete) {
        const { error } = await supabase
          .from("projects")
          .update({ status: "scheduled" })
          .eq("id", projectId);

        if (!error) onStatusChange?.("scheduled");
      }
    }
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id);
    setForm({
      title: m.title,
      description: m.description ?? "",
      scheduled_date: m.scheduled_date ?? "",
      completed_date: m.completed_date ?? "",
    });
    setFormErrors({});
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        scheduled_date: form.scheduled_date || null,
        completed_date: form.completed_date || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("milestones")
          .update(payload)
          .eq("id", editingId);

        if (!mountedRef.current) return;
        if (error) {
          setError(error.message);
          setSaving(false);
          return;
        }
      } else {
        const maxOrder =
          milestones.length > 0
            ? Math.max(...milestones.map((m) => m.order_index))
            : -1;

        const { error } = await supabase.from("milestones").insert({
          ...payload,
          project_id: projectId,
          order_index: maxOrder + 1,
        });

        if (!mountedRef.current) return;
        if (error) {
          setError(error.message);
          setSaving(false);
          return;
        }
      }

      setForm(emptyForm);
      setEditingId(null);
      setFormErrors({});
      setSaving(false);
      await fetchMilestones();
    } catch (err) {
      if (!mountedRef.current) return;
      setError(
        `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
      );
      setSaving(false);
    }
  }

  async function handleMarkComplete(m: Milestone) {
    const today = new Date().toISOString().split("T")[0];
    const wasCompleted = !!m.completed_date;
    const newDate = wasCompleted ? null : today;

    const { error } = await supabase
      .from("milestones")
      .update({ completed_date: newDate })
      .eq("id", m.id);

    if (!mountedRef.current) return;
    if (error) {
      setError(error.message);
      return;
    }

    // Build the updated list for status logic
    const updatedMilestones = milestones.map((ms) =>
      ms.id === m.id ? { ...ms, completed_date: newDate } : ms
    );
    setMilestones(updatedMilestones);

    await updateProjectStatus(updatedMilestones, m.title, wasCompleted);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("milestones")
      .delete()
      .eq("id", id);

    if (!mountedRef.current) return;
    if (error) {
      setError(error.message);
      return;
    }
    if (editingId === id) cancelEdit();
    await fetchMilestones();
  }

  async function handlePrefill() {
    const titles =
      PRESET_MILESTONES[projectType] ?? PRESET_MILESTONES["Other"];
    setPrefilling(true);
    setError("");

    const startIndex =
      milestones.length > 0
        ? Math.max(...milestones.map((m) => m.order_index)) + 1
        : 0;

    const rows = titles.map((title, i) => ({
      project_id: projectId,
      title,
      description: null,
      scheduled_date: null,
      completed_date: null,
      order_index: startIndex + i,
    }));

    const { error } = await supabase.from("milestones").insert(rows);

    if (!mountedRef.current) return;
    if (error) {
      setError(error.message);
    }
    setPrefilling(false);
    await fetchMilestones();
  }

  // ── Drag & Drop reorder ──
  function onDragStart(idx: number) {
    dragItem.current = idx;
    setDragIdx(idx);
  }

  function onDragEnter(idx: number) {
    dragOverItem.current = idx;
  }

  async function onDragEnd() {
    setDragIdx(null);
    if (
      dragItem.current === null ||
      dragOverItem.current === null ||
      dragItem.current === dragOverItem.current
    ) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...milestones];
    const [moved] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, moved);

    // Optimistic update
    const updated = reordered.map((m, i) => ({ ...m, order_index: i }));
    setMilestones(updated);

    dragItem.current = null;
    dragOverItem.current = null;

    // Persist all order_index changes
    const updates = updated.map((m) =>
      supabase
        .from("milestones")
        .update({ order_index: m.order_index })
        .eq("id", m.id)
    );
    const results = await Promise.all(updates);
    if (!mountedRef.current) return;
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError("Failed to save new order");
      await fetchMilestones();
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Loading milestones...</p>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-navy">
            {editingId ? "Edit Milestone" : "Add Milestone"}
          </h3>
          {milestones.length === 0 && !editingId && (
            <button
              type="button"
              onClick={handlePrefill}
              disabled={prefilling}
              className="text-sm font-medium text-orange hover:text-orange/80 transition disabled:opacity-50"
            >
              {prefilling ? "Adding..." : `Pre-fill ${projectType} milestones`}
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  if (formErrors.title)
                    setFormErrors((p) => {
                      const n = { ...p };
                      delete n.title;
                      return n;
                    });
                }}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition ${formErrors.title ? "border-red-400" : "border-gray-300"}`}
                placeholder="e.g. Materials Delivered"
              />
              {formErrors.title && (
                <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
                placeholder="Optional details"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_date: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completed Date
              </label>
              <input
                type="date"
                value={form.completed_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, completed_date: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition"
              />
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
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Milestone"
                  : "Add Milestone"}
            </button>
          </div>
        </form>
      </div>

      {/* Pre-fill button when milestones exist */}
      {milestones.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handlePrefill}
            disabled={prefilling}
            className="text-sm font-medium text-orange hover:text-orange/80 transition disabled:opacity-50"
          >
            {prefilling ? "Adding..." : `+ Add ${projectType} preset milestones`}
          </button>
        </div>
      )}

      {/* Milestones list */}
      {milestones.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No milestones yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Add one above or use the pre-fill button
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((m, idx) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragEnter={() => onDragEnter(idx)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-start gap-3 transition ${
                dragIdx === idx ? "opacity-40" : ""
              }`}
            >
              {/* Drag handle */}
              <div className="cursor-grab text-gray-300 hover:text-gray-500 pt-0.5 flex-shrink-0 select-none">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
                </svg>
              </div>

              {/* Completion status */}
              <button
                type="button"
                onClick={() => handleMarkComplete(m)}
                className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                  m.completed_date
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-orange text-transparent hover:text-orange/30"
                }`}
                title={
                  m.completed_date ? "Mark incomplete" : "Mark complete"
                }
              >
                <svg
                  className="h-3.5 w-3.5"
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
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={`font-medium text-sm ${
                        m.completed_date
                          ? "text-gray-400 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {m.title}
                    </p>
                    {m.description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {m.description}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {m.scheduled_date && (
                        <span className="text-xs text-gray-400">
                          Scheduled:{" "}
                          {new Date(
                            m.scheduled_date + "T00:00:00"
                          ).toLocaleDateString()}
                        </span>
                      )}
                      {m.completed_date && (
                        <span className="text-xs text-green-600 font-medium">
                          Completed:{" "}
                          {new Date(
                            m.completed_date + "T00:00:00"
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
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
                      onClick={() => handleDelete(m.id)}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
