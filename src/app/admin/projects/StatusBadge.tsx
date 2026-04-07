const styles: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700",
  in_progress: "bg-orange/10 text-orange",
  complete: "bg-green-100 text-green-700",
};

const labels: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  complete: "Complete",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
        styles[status] || styles.scheduled
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
