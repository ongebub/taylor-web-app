import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProjectTabs from "./ProjectTabs";
import { formatFullAddress } from "@/lib/utils";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const formData = {
    id: project.id,
    slug: project.slug ?? "",
    customer_name: project.customer_name ?? "",
    customer_email: project.customer_email ?? "",
    customer_phone: project.customer_phone ?? "",
    street_address: project.street_address ?? "",
    city: project.city ?? "Des Moines",
    state: project.state ?? "IA",
    zip: project.zip ?? "",
    project_type: project.project_type ?? "Roofing",
    status: project.status ?? "scheduled",
    current_phase: project.current_phase ?? "",
    start_date: project.start_date ?? "",
    estimated_completion: project.estimated_completion ?? "",
    actual_completion: project.actual_completion ?? "",
    notes: project.notes ?? "",
  };

  const fullAddress = formatFullAddress(
    formData.street_address,
    formData.city,
    formData.state,
    formData.zip
  );

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          &larr; Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-navy mt-2">
          {project.customer_name}
        </h1>
        {fullAddress && (
          <p className="text-sm text-gray-500 mt-0.5">{fullAddress}</p>
        )}
      </div>

      <ProjectTabs project={formData} />
    </div>
  );
}
