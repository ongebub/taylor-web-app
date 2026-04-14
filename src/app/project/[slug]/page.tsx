import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomerPortal from "./CustomerPortal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("customer_name, project_type")
    .eq("slug", slug)
    .single();

  if (!project) return { title: "Project Not Found" };

  return {
    title: `${project.customer_name} — ${project.project_type} | Taylor Exteriors`,
    description: `Track your ${project.project_type.toLowerCase()} project with Taylor Exteriors & Construction.`,
  };
}

export default async function ProjectPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!project) notFound();

  const [milestonesRes, photosRes, warrantiesRes, documentsRes] =
    await Promise.all([
      supabase
        .from("milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true }),
      supabase
        .from("photos")
        .select("*")
        .eq("project_id", project.id)
        .order("order_index", { ascending: true }),
      supabase
        .from("warranties")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("documents")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <CustomerPortal
      project={project}
      milestones={milestonesRes.data ?? []}
      photos={photosRes.data ?? []}
      warranties={warrantiesRes.data ?? []}
      documents={documentsRes.data ?? []}
    />
  );
}
