"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";

const PROJECT_TYPES = [
  "Roofing",
  "Siding",
  "Windows & Doors",
  "Decking",
  "Storm Damage",
  "Other",
];

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

export interface ProjectData {
  id?: string;
  slug?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  project_type: string;
  status: string;
  current_phase: string;
  start_date: string;
  estimated_completion: string;
  actual_completion: string;
  notes: string;
}

const emptyProject: ProjectData = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  street_address: "",
  city: "Des Moines",
  state: "IA",
  zip: "",
  project_type: "Roofing",
  status: "scheduled",
  current_phase: "",
  start_date: "",
  estimated_completion: "",
  actual_completion: "",
  notes: "",
};

export default function ProjectDetailsForm({
  project,
}: {
  project?: ProjectData;
}) {
  const isNew = !project?.id;
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState<ProjectData>(project ?? emptyProject);
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Auto-generate slug from last name + street address
  useEffect(() => {
    if (!slugTouched) {
      setSlug(generateSlug(form.customer_name, form.street_address));
    }
  }, [form.customer_name, form.street_address, slugTouched]);

  function update(field: keyof ProjectData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSuccess("");
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.customer_name.trim()) {
      errs.customer_name = "Customer name is required";
    }
    if (!slug.trim()) {
      errs.slug = "Slug is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function formatSupabaseError(error: { message: string; code?: string; details?: string }): Record<string, string> {
    console.log("Supabase error:", JSON.stringify(error, null, 2));

    if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return { slug: "A project with this slug already exists", _form: "A project with this slug already exists. Please choose a different slug." };
    }

    if (error.code === "42501" || error.message?.includes("policy")) {
      return { _form: "Permission denied. Make sure you are logged in as an admin." };
    }

    return { _form: error.message || "An unknown error occurred while saving." };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSuccess("");
    setErrors({});

    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_email: form.customer_email.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        street_address: form.street_address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip: form.zip.trim() || null,
        project_type: form.project_type,
        status: form.status,
        current_phase: form.current_phase.trim() || null,
        start_date: form.start_date || null,
        estimated_completion: form.estimated_completion || null,
        actual_completion: form.actual_completion || null,
        notes: form.notes.trim() || null,
        slug: slug.trim(),
      };

      console.log("Saving project:", isNew ? "INSERT" : "UPDATE", payload);

      if (isNew) {
        const { data, error } = await supabase
          .from("projects")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          setErrors(formatSupabaseError(error));
          setSaving(false);
          return;
        }

        if (!data?.id) {
          console.log("Insert returned no data:", data);
          setErrors({ _form: "Project was created but no ID was returned. Check the projects list." });
          setSaving(false);
          return;
        }

        router.push(`/admin/projects/${data.id}`);
        router.refresh();
      } else {
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", project!.id!);

        if (error) {
          setErrors(formatSupabaseError(error));
          setSaving(false);
          return;
        }
        setSuccess("Project saved successfully");
        setSaving(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Unexpected error saving project:", err);
      setErrors({
        _form: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      });
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {errors._form}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Customer Name"
          required
          error={errors.customer_name}
        >
          <input
            type="text"
            value={form.customer_name}
            onChange={(e) => update("customer_name", e.target.value)}
            className={inputClass(errors.customer_name)}
            placeholder="John & Jane Smith"
          />
        </Field>
        <Field label="Customer Email">
          <input
            type="email"
            value={form.customer_email}
            onChange={(e) => update("customer_email", e.target.value)}
            className={inputClass()}
            placeholder="john@example.com"
          />
        </Field>
        <Field label="Customer Phone">
          <input
            type="tel"
            value={form.customer_phone}
            onChange={(e) => update("customer_phone", e.target.value)}
            className={inputClass()}
            placeholder="(555) 123-4567"
          />
        </Field>
      </div>

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Street Address">
            <input
              type="text"
              value={form.street_address}
              onChange={(e) => update("street_address", e.target.value)}
              className={inputClass()}
              placeholder="123 Main St"
            />
          </Field>
        </div>
        <Field label="City">
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass()}
            placeholder="Des Moines"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State">
            <input
              type="text"
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
              className={inputClass()}
              placeholder="IA"
              maxLength={2}
            />
          </Field>
          <Field label="Zip Code">
            <input
              type="text"
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              className={inputClass()}
              placeholder="50309"
            />
          </Field>
        </div>
      </div>

      {/* Slug */}
      <Field label="Project Slug (URL path)" error={errors.slug}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">
            /project/
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
              if (errors.slug) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.slug;
                  return next;
                });
              }
            }}
            className={inputClass(errors.slug)}
          />
        </div>
      </Field>

      {/* Project Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Project Type">
          <select
            value={form.project_type}
            onChange={(e) => update("project_type", e.target.value)}
            className={inputClass()}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className={inputClass()}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Current Phase">
          <input
            type="text"
            value={form.current_phase}
            onChange={(e) => update("current_phase", e.target.value)}
            className={inputClass()}
            placeholder="e.g. Tear-off complete"
          />
        </Field>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Start Date">
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => update("start_date", e.target.value)}
            className={inputClass()}
          />
        </Field>
        <Field label="Estimated Completion">
          <input
            type="date"
            value={form.estimated_completion}
            onChange={(e) => update("estimated_completion", e.target.value)}
            className={inputClass()}
          />
        </Field>
        <Field label="Actual Completion">
          <input
            type="date"
            value={form.actual_completion}
            onChange={(e) => update("actual_completion", e.target.value)}
            className={inputClass()}
          />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Internal Notes (not shown to customer)">
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          className={inputClass()}
          placeholder="Internal notes about this project..."
        />
      </Field>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-orange hover:bg-orange/90 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? "Saving..."
            : isNew
              ? "Create Project"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

/* ── helpers ── */

function inputClass(error?: string) {
  return `w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent transition ${
    error ? "border-red-400" : "border-gray-300"
  }`;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
