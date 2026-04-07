import Link from "next/link";
import ProjectDetailsForm from "../ProjectDetailsForm";

export default function NewProjectPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/projects"
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          &larr; Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-navy mt-2">New Project</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <ProjectDetailsForm />
      </div>
    </div>
  );
}
