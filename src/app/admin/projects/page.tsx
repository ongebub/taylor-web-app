import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { formatFullAddress } from "@/lib/utils";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, slug, customer_name, street_address, city, state, zip, project_type, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Projects</h1>
        <Link
          href="/admin/projects/new"
          className="bg-orange hover:bg-orange/90 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          New Project
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
          Failed to load projects: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!error && (!projects || projects.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No projects yet</p>
          <Link
            href="/admin/projects/new"
            className="bg-orange hover:bg-orange/90 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition inline-block"
          >
            Create your first project
          </Link>
        </div>
      )}

      {/* Desktop table */}
      {projects && projects.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Address
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Created
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {project.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatFullAddress(
                        project.street_address ?? "",
                        project.city ?? "",
                        project.state ?? "",
                        project.zip ?? ""
                      ) || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {project.project_type}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(project.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a
                        href={`/project/${project.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-orange hover:text-orange/80 font-medium transition"
                      >
                        View Portal
                      </a>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="inline-block text-sm text-navy hover:text-navy/70 font-medium transition"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">
                    {project.customer_name}
                  </h2>
                  <StatusBadge status={project.status} />
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  {formatFullAddress(
                    project.street_address ?? "",
                    project.city ?? "",
                    project.state ?? "",
                    project.zip ?? ""
                  ) || "No address"}
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  {project.project_type}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {new Date(project.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-3">
                  <a
                    href={`/project/${project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange hover:text-orange/80 font-medium transition"
                  >
                    View Portal
                  </a>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="text-sm text-navy hover:text-navy/70 font-medium transition"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
