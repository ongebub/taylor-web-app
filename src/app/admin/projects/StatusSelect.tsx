"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const OPTIONS: { value: string; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

const styles: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700 ring-gray-200",
  in_progress: "bg-orange/10 text-orange ring-orange/30",
  complete: "bg-green-100 text-green-700 ring-green-200",
};

export default function StatusSelect({
  projectId,
  initialStatus,
}: {
  projectId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = status;
    setStatus(next);
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("projects")
        .update({ status: next })
        .eq("id", projectId);

      if (updateError) {
        setStatus(prev);
        setError(updateError.message);
      }
    });
  }

  const style = styles[status] || styles.scheduled;

  return (
    <div className="inline-flex flex-col gap-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        className={`text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange ${style}`}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-white text-gray-900">
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[10px] text-red-600 leading-tight">
          {error}
        </span>
      )}
    </div>
  );
}
