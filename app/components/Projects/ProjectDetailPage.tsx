"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  PauseCircle,
  Users,
  Calendar,
} from "lucide-react";
import type { ProjectFromDB } from "@/app/components/Projects/ProjectCard"; // adjust if your path differs

function formatDate(d?: string | Date | null) {
  if (!d) return "-";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleString();
  } catch {
    return String(d);
  }
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  if (s === "completed")
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <CheckCircle size={16} /> Completed
      </span>
    );
  if (s === "on hold" || s === "hold" || s === "pending")
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
        <PauseCircle size={16} /> {status ?? "Pending"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
      <Clock size={16} /> {status ?? "In Progress"}
    </span>
  );
}

const PageSkeleton = () => (
  <div className="max-w-6xl mx-auto p-6">
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/3 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="h-48 bg-white rounded-lg shadow-sm border p-4" />
          <div className="h-64 bg-white rounded-lg shadow-sm border p-4" />
        </div>
        <div>
          <div className="h-40 bg-white rounded-lg shadow-sm border p-4" />
          <div className="h-40 bg-white rounded-lg shadow-sm border p-4 mt-4" />
        </div>
      </div>
    </div>
  </div>
);

export default function ProjectDetailPage({ id }: { id: string }) {
  const router = useRouter();

  const [project, setProject] = useState<ProjectFromDB | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      toast.error("Invalid project id.");
      router.push("/dashboard/projects");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadProject() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/project?projectid=${encodeURIComponent(id)}`,
          {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted || cancelled) return;

        // AUTH -> go to login (avoid bouncing to list)
        if (res.status === 401) {
          toast.error("Please sign in to view that project.");
          router.push("/login?reason=auth");
          return;
        }

        // Not found -> back to list
        if (res.status === 404) {
          toast.error("Project not found.");
          router.push("/dashboard/projects");
          return;
        }

        // Try to parse body safely
        const data = await res.json().catch(() => null);

        // Other non-ok statuses: show error UI (do not redirect automatically)
        if (!res.ok) {
          const msg =
            (data && (data.message || data.error)) ||
            `Failed to load project (status ${res.status}).`;
          console.error("Project fetch error:", msg);
          setError(msg);
          return;
        }

        // accept either object or { project: obj }
        const fetched: ProjectFromDB | null =
          (data && (data.project ?? data)) ?? null;

        if (!fetched) {
          // treat as an error and show retry/back UI
          const msg = "Project data missing from server response.";
          console.error("Project fetch error: missing project");
          setError(msg);
          return;
        }

        setProject(fetched);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Error loading project:", err);
        setError("Network error while loading project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProject();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // include reloadKey so Retry actually refetches
  }, [id, reloadKey, router]);

  const { totalSteps, completedSteps, progress } = useMemo(() => {
    const total = Array.isArray(project?.steps) ? project!.steps.length : 0;
    const completed = total
      ? project!.steps.filter(
          (s) => String(s.status || "").toLowerCase() === "completed"
        ).length
      : 0;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { totalSteps: total, completedSteps: completed, progress: pct };
  }, [project?.steps]);

  async function handleDelete() {
    if (!project?._id) return;
    if (!confirm("Delete this project? This action cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/project?projectid=${encodeURIComponent(project._id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        let msg = `Failed to delete (status ${res.status})`;
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {}
        toast.error(msg);
        setDeleting(false);
        return;
      }

      toast.success("Project deleted.");
      router.push("/dashboard/projects");
    } catch (err) {
      toast.error("Network error deleting project.");
      setDeleting(false);
    }
  }

  function handleEdit() {
    router.push(
      `/dashboard/projects/${project?._id ?? project?.id ?? ""}/edit`
    );
  }

  if (loading) return <PageSkeleton />;

  // show error UI and avoid auto-redirect loops
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load project
          </div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border"
            >
              Back to projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we have no project (and no error), show not-found UI — but do NOT auto-redirect
  if (!project) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">
            Project not available
          </div>
          <div className="text-sm text-gray-600 mb-4">
            The project could not be loaded. You can retry or go back to the
            list.
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border"
            >
              Back to projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const versions = project.versions ?? [];
  const developers = project.developers ?? [];
  const steps = project.steps ?? [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-blue-500 border hover:bg-blue-600 text-white "
            aria-label="Back to projects"
          >
            <ArrowLeft size={16} className="text-white" /> Back
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {project.title}
            </h1>
            <div className="mt-1 text-sm text-gray-600 flex items-center gap-3">
              <div className="inline-flex items-center gap-2">
                <Calendar size={14} /> {formatDate(project.dueDate)}
              </div>
              <div className="inline-flex items-center gap-2">
                <Users size={14} />{" "}
                {project.contactName ?? project.email ?? "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <div className="text-xs text-gray-500">Progress</div>
            <div className="text-lg font-semibold text-gray-900">
              {progress}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-black"
            >
              <Edit2 size={14} className="text-black" /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* main column */}
        <main className="lg:col-span-2 space-y-6">
          {/* description card */}
          <section className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Description
              </h2>
              <StatusBadge status={project.status} />
            </div>

            <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">
              {project.description ?? "No description provided."}
            </div>

            <div className="mt-6">
              <div className="text-xs text-gray-500">Progress</div>
              <div className="mt-2 w-full h-3 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-3 rounded bg-gradient-to-r from-blue-400 to-indigo-600"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {completedSteps}/{totalSteps} steps completed
              </div>
            </div>
          </section>

          {/* steps timeline */}
          <section className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Steps & Timeline
            </h3>
            {steps.length === 0 ? (
              <div className="text-sm text-gray-500">
                No steps recorded for this project.
              </div>
            ) : (
              <ol className="space-y-4">
                {steps.map((s, idx) => (
                  <li key={s.id ?? idx} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background:
                            s.status?.toLowerCase() === "completed"
                              ? "#10B981"
                              : s.status?.toLowerCase().includes("hold")
                              ? "#F59E0B"
                              : "#3B82F6",
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {s.step}
                          </div>
                          <div className="text-xs text-gray-500">
                            {s.notes ?? ""}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.weekday ? `${s.weekday} • ` : ""}
                          {formatDate(s.createdAt ?? s.date)}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-600">
                        <div>
                          Created by:{" "}
                          <span className="font-medium text-gray-800">
                            {s.createdBy ?? "-"}
                          </span>
                        </div>
                        {s.updatedBy && (
                          <div>
                            Updated by:{" "}
                            <span className="font-medium text-gray-800">
                              {s.updatedBy}
                            </span>
                          </div>
                        )}
                        {s.data && (
                          <details className="mt-1 text-xs text-gray-500">
                            <summary className="cursor-pointer">
                              View step extra data
                            </summary>
                            <pre className="mt-2 text-xs text-gray-700 overflow-auto max-h-40 bg-gray-50 p-2 rounded">
                              {JSON.stringify(s.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </main>

        {/* sidebar */}
        <aside className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Client</div>
                <div className="text-sm font-medium text-gray-900">
                  {project.contactName ?? project.email ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Company</div>
                <div className="text-sm font-medium text-gray-900">
                  {project.company ?? "-"}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <div className="text-xs text-gray-500">Owner </div>
                <div className="text-sm font-medium text-gray-900">
                  {project.contactName ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Contact Email</div>
                <div className="text-sm font-medium text-gray-900">
                  {project.email ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Created</div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(project.createdAt)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Last updated</div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(project.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                Developers
              </h4>
              <div className="text-xs text-gray-500">{developers.length}</div>
            </div>

            <div className="mt-3 space-y-2">
              {developers.length === 0 && (
                <div className="text-sm text-gray-500">
                  No developers added.
                </div>
              )}
              {developers.map((d, i) => (
                <div
                  key={d.name + i}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-medium text-gray-800">
                      {d.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{d.name}</div>
                      {d.portfolio && (
                        <a
                          className="text-xs text-blue-600 hover:underline"
                          href={d.portfolio}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Contact
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                Quick Info
              </h4>
              <div className="text-xs text-gray-500">
                {project.status ?? "-"}
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-700 space-y-2">
              <div>
                <div className="text-xs text-gray-500">Due date</div>
                <div className="font-medium">{formatDate(project.dueDate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Steps</div>
                <div className="font-medium">{totalSteps}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Completed</div>
                <div className="font-medium">{completedSteps}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
