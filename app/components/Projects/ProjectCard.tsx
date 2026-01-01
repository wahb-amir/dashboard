"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronRight,
  Clock,
  CheckCircle,
  PauseCircle,
  User,
  Calendar,
  Users,
} from "lucide-react";
import type { AuthTokenPayload } from "@/app/utils/token";
import { useRouter, usePathname } from "next/navigation";

type Step = {
  id: string;
  step: string;
  weekday?: string;
  date?: string;
  data?: Record<string, any>;
  status?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string | Date;
  updatedBy?: string;
};

export type ProjectFromDB = {
  _id?: string;
  id?: string;
  userId: string;
  title: string;
  description?: string | null;
  company?: string | null;
  dueDate?: string | null;
  email?: string | null;
  contactName?: string | null;
  steps: Step[];
  currentFocus?: string;
  status?: string;
  developers?: { name: string; portfolio?: string | null }[];
  versions?: any[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectCardProps = {
  project: ProjectFromDB;
  currentUser?: AuthTokenPayload | null;
  onView?: (id: string) => void;
  className?: string;
};

function formatDate(d?: string | Date | null) {
  if (!d) return "-";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  if (s === "completed")
    return (
      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle size={14} /> Completed
      </span>
    );
  if (s === "on hold" || s === "hold" || s === "pending")
    return (
      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <PauseCircle size={14} /> {status ?? "Pending"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
      <Clock size={14} /> {status ?? "In Progress"}
    </span>
  );
}

export default function ProjectCard({
  project,
  currentUser,
  onView,
  className = "",
}: ProjectCardProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [expanded, setExpanded] = useState(false);

  const id = project.id ?? project._id ?? "";
  const title = project.title ?? "Untitled Project";
  const client =
    project.contactName ??
    project.email ??
    currentUser?.name ??
    currentUser?.email ??
    "-";

  const description =
    project.description ?? project.versions?.[0]?.snapshot?.description ?? "";

  // progress by steps
  const { totalSteps, completedSteps, progress } = useMemo(() => {
    const total = Array.isArray(project.steps) ? project.steps.length : 0;
    const completed = total
      ? project.steps.filter(
          (s) => String(s.status || "").toLowerCase() === "completed"
        ).length
      : 0;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { totalSteps: total, completedSteps: completed, progress: pct };
  }, [project.steps]);

  const dueDateStr = formatDate(project.dueDate);

  function handleView() {
    if (onView) return onView(id);
    router.push(`/dashboard/projects/${id}`);
  }

  const recentSteps = (project.steps ?? []).slice().reverse().slice(0, 3);

  // decide minimal vs full
  const isDashboardHome =
    pathname === "/dashboard" || pathname === "/dashboard/";
  const isProjectPage = pathname.startsWith("/dashboard/projects");

  // --- Minimal card for /dashboard (home) ---
  if (isDashboardHome) {
    return (
      <article
        className={`bg-white rounded-lg shadow-sm border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-h-[80px] ${className}`}
      >
        <div className="min-w-0 w-full">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h3>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
            <div className="inline-flex items-center gap-2">
              <Calendar size={14} />{" "}
              <span className="text-xs">{dueDateStr}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Users size={14} />{" "}
              <span className="text-xs truncate max-w-[140px]">{client}</span>
            </div>

            <div className="mt-2 sm:mt-0 w-full sm:w-auto">
              <div className="w-full h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-2 rounded bg-gradient-to-r from-blue-400 to-indigo-600"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <div className="flex-shrink-0">
            <StatusBadge status={project.status} />
          </div>

          <button
            onClick={handleView}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-50 transition w-full sm:w-auto justify-center"
            aria-label={`View ${title}`}
          >
            View <ChevronRight size={16} />
          </button>
        </div>
      </article>
    );
  }

  // --- Full / detailed card for all other places (includes /dashboard/projects/*) ---
  return (
    <article className={`bg-white rounded-lg shadow border p-5 ${className}`}>
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h3>
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <User size={14} />{" "}
                  <span className="truncate max-w-[140px] sm:max-w-[180px]">
                    {client}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} /> <span>{dueDateStr}</span>
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <StatusBadge status={project.status} />
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-700 line-clamp-3">
            {description || "No description provided."}
          </p>

          {/* progress bar + small meta */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <div className="flex items-center justify-between text-sm text-gray-700">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {progress}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {completedSteps}/{totalSteps} steps
                </div>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-2 rounded bg-gradient-to-r from-blue-400 to-indigo-600"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-gray-500">Developers</div>
              <div className="mt-1 flex items-center justify-start sm:justify-end gap-2">
                {(project.developers ?? []).slice(0, 3).map((d, i) => (
                  <div
                    key={d.name + i}
                    title={d.portfolio ?? d.name}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-medium text-gray-800"
                  >
                    {d.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                ))}
                {(project.developers ?? []).length > 3 && (
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-xs text-gray-600">
                    +{(project.developers ?? []).length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* steps preview */}
      <div className="mt-5 border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium text-gray-800 mb-2">
            Recent Activity
          </div>
          {recentSteps.length === 0 ? (
            <div className="text-xs text-gray-500">No activity yet.</div>
          ) : (
            <ul className="space-y-3">
              {recentSteps.map((s) => (
                <li key={s.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 font-medium truncate">
                      {s.step}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.notes ? s.notes : formatDate(s.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-gray-800 mb-2">Details</div>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} /> <span>Due date</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {dueDateStr}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users size={14} /> <span>Owner</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {project.contactName ?? "-"}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={14} /> <span>Last updated</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {formatDate(project.updatedAt ?? project.createdAt)}
              </div>
            </div>

            {project.currentFocus && (
              <div className="pt-2">
                <div className="text-xs text-gray-500">Current focus</div>
                <div className="mt-1 text-sm text-gray-900">
                  {project.currentFocus}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <button
          onClick={() => setExpanded((s) => !s)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition w-full sm:w-auto justify-center"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>

        <button
          onClick={handleView}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition w-full sm:w-auto justify-center"
        >
          View Details <ChevronRight size={14} />
        </button>
      </footer>

      {/* optional expanded area for full steps (client-side only) */}
      {expanded && (
        <div className="mt-4 border-t pt-4">
          <div className="text-sm font-medium text-gray-800 mb-2">
            All Steps
          </div>
          <ol className="space-y-3">
            {(project.steps ?? []).map((s) => (
              <li key={s.id} className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-1" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 font-medium">
                    {s.step}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.notes ?? formatDate(s.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
