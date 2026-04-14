"use client";

import { useState } from "react";
import ProjectDetailsForm, {
  type ProjectData,
} from "../ProjectDetailsForm";
import PhotosTab from "./PhotosTab";
import MilestonesTab from "./MilestonesTab";
import WarrantiesTab from "./WarrantiesTab";
import DocumentsTab from "./DocumentsTab";
import ReferralsTab from "./ReferralsTab";
import ShareQRTab from "./ShareQRTab";

const TABS = [
  "Project Details",
  "Photos",
  "Milestones",
  "Warranties",
  "Documents",
  "Referrals",
  "Share & QR",
] as const;

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-gray-100 text-gray-700",
  in_progress: "bg-orange/10 text-orange",
  complete: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  complete: "Complete",
};

export default function ProjectTabs({ project }: { project: ProjectData }) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);
  const [projectStatus, setProjectStatus] = useState(project.status);

  function handleStatusChange(newStatus: string) {
    setProjectStatus(newStatus);
  }

  return (
    <div>
      {/* Status badge */}
      <div className="mb-4">
        <span
          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
            STATUS_STYLES[projectStatus] || STATUS_STYLES.scheduled
          }`}
        >
          {STATUS_LABELS[projectStatus] || projectStatus}
        </span>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? "border-orange text-orange"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "Project Details" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <ProjectDetailsForm
            project={{ ...project, status: projectStatus }}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {activeTab === "Photos" && project.id && (
        <PhotosTab projectId={project.id} />
      )}

      {activeTab === "Milestones" && project.id && (
        <MilestonesTab
          projectId={project.id}
          projectType={project.project_type}
          onStatusChange={handleStatusChange}
        />
      )}

      {activeTab === "Warranties" && project.id && (
        <WarrantiesTab projectId={project.id} />
      )}

      {activeTab === "Documents" && project.id && (
        <DocumentsTab projectId={project.id} />
      )}

      {activeTab === "Referrals" && project.id && (
        <ReferralsTab projectId={project.id} />
      )}

      {activeTab === "Share & QR" && project.slug && (
        <ShareQRTab slug={project.slug} />
      )}
    </div>
  );
}
