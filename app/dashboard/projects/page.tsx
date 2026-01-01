"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { AuthTokenPayload } from "@/app/utils/token";
import CreateProjectModal from "@/app/components/Projects/CreateProjectModal";
import GetQuoteModal, {
  QuotePayload,
} from "@/app/components/Quote/GetQuoteModal";
import { Plus, Search, Activity } from "lucide-react";
import ProjectCard, {
  ProjectFromDB,
} from "@/app/components/Projects/ProjectCard";
import { ChevronRight } from "lucide-react";

type Props = {
  user?: AuthTokenPayload | null;
  needsRefresh?: boolean;
};

export default function DashboardProjectsPage({
  user = null,
  needsRefresh = false,
}: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthTokenPayload | null>(user);

  const [projects, setProjects] = useState<ProjectFromDB[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState<QuotePayload | null>(null);

  const [query, setQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // load projects (runs on mount and when currentUser / refreshKey / needsRefresh changes)
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const res = await fetch("/api/project", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (controller.signal.aborted || cancelled) return;

        if (!res.ok) {
          let errMsg = `Failed to load projects (status ${res.status})`;
          try {
            const errJson = await res.json();
            if (errJson?.message) errMsg = errJson.message;
          } catch {}
          setProjectsError(errMsg);
          toast.error(errMsg);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data) {
          setProjectsError("Invalid project data returned from server.");
          toast.error("Invalid project data returned from server.");
          return;
        }

        const loaded: ProjectFromDB[] = Array.isArray(data)
          ? data
          : data.projects ?? [];
        setProjects(loaded);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setProjectsError("Network error while loading projects.");
        toast.error("Network error while loading projects.");
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentUser, refreshKey, needsRefresh]);

  // wire create callback (you can replace with real create flow)
  const onCreate = async (payload: any) => {
    // optimistic UI: close modal, show toast, refresh list
    setOpenCreate(false);
    toast.success("Project created (UI refreshed).");
    // trigger refetch (you might prefer to insert the created item directly)
    setRefreshKey((k) => k + 1);
  };

  const onRequested = (q: QuotePayload) => {
    setQuote(q);
    setQuoteOpen(false);
    toast.success("Quote requested!");
  };

  // search/filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      return (
        (p.title ?? "").toLowerCase().includes(q) ||
        (p.contactName ?? p.email ?? "").toLowerCase().includes(q) ||
        String((p as any).description ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [projects, query]);

  // minimal skeleton component that matches ProjectCard size
  const SkeletonProjectCard = () => (
    <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="h-5 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
            <div className="flex-shrink-0">
              <div className="h-8 w-24 bg-gray-200 rounded-full" />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 items-center">
            <div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <div className="h-3 w-16 bg-gray-200 rounded" />
                <div className="h-3 w-12 bg-gray-200 rounded" />
              </div>

              <div className="w-full h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                <div
                  className="h-2 rounded bg-gradient-to-r from-gray-200 to-gray-300"
                  style={{ width: "40%" }}
                />
              </div>
            </div>

            <div className="text-right">
              <div className="h-3 w-20 bg-gray-200 rounded mx-auto" />
              <div className="mt-2 flex items-center justify-end gap-2">
                <div className="h-8 w-8 bg-gray-100 rounded-full" />
                <div className="h-8 w-8 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <div className="h-8 w-24 bg-gray-100 rounded" />
      </div>
    </div>
  );

  // retry / empty states
  if (projectsError && !projectsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">
            Could not load projects
          </div>
          <div className="text-sm text-gray-600 mb-4">{projectsError}</div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* header: mobile stacked, at >=980px becomes a row (bp-header) */}
      <div className="flex flex-col bp-header gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Projects</h1>
          <p className="text-sm text-gray-600">
            All projects — full details shown here.
          </p>
        </div>

        <div className="flex items-center gap-3 header-actions">
          <div className="relative bp-input-wrapper flex-shrink-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="search"
              aria-label="Search projects"
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-3 py-2 rounded-md border bg-white shadow-sm w-full max-w-[320px] focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center gap-2 actions">
            <button
              onClick={() => setQuoteOpen(true)}
              className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md border bg-transparent hover:bg-gray-50 text-black text-sm whitespace-nowrap"
            >
              Request Quote
              <ChevronRight size={14} />
            </button>

            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md bg-blue-600 text-white font-semibold hover:brightness-95 transition text-sm whitespace-nowrap"
            >
              <Plus size={16} /> New Project
            </button>
          </div>

          <CreateProjectModal
            open={openCreate}
            onClose={() => setOpenCreate(false)}
            onCreate={onCreate}
          />
          <GetQuoteModal
            open={quoteOpen}
            onClose={() => setQuoteOpen(false)}
            onRequested={onRequested}
          />
        </div>
      </div>

      {/* projects grid: 1 column on small screens, 2 columns at >=980px via bp-grid */}
      <div className="grid grid-cols-1 bp-grid gap-6">
        {projectsLoading ? (
          // show 4 skeleton cards while loading (responsive)
          <>
            <SkeletonProjectCard />
            <SkeletonProjectCard />
            <SkeletonProjectCard />
            <SkeletonProjectCard />
          </>
        ) : (
          <>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-6 col-span-full text-center text-gray-700">
                No projects found. Create your first project to get started.
              </div>
            ) : (
              filtered.map((p) => (
                <ProjectCard
                  key={p._id ?? (p as any).id}
                  project={p}
                  currentUser={currentUser}
                  onView={(id) => router.push(`/dashboard/projects/${id}`)}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* bottom actions / small footer */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <div>
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </div>
        <div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border"
          >
            Refresh
            <Activity size={14} />
          </button>
        </div>
      </div>

      <style jsx>{`
        /* default (mobile): header stacks and input is full width up to max-width; grid is single column */
        .bp-header {
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap; /* allow actions to wrap instead of overflowing */
        }

        .actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .actions > * {
          flex: 0 1 auto; /* don't force buttons to stretch */
        }

        /* at >=980px we want the header to act like a row with space-between */
        @media (min-width: 980px) {
          .bp-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          /* make the projects grid 2 columns at the 980px breakpoint */
          .bp-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* ensure bp-grid has sensible fallback */
        .bp-grid {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}
