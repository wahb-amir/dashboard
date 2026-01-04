"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

const PAGE_SIZE = 5;

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

  // pagination state
  const [page, setPage] = useState<number>(0); // current loaded page index (0-based)
  const [hasMore, setHasMore] = useState<boolean>(false);

  // abort controller ref to cancel inflight fetches
  const controllerRef = useRef<AbortController | null>(null);

  // load a page of projects. append=true will append to existing list.
  const loadProjects = async (loadPage = 0, append = false) => {
    // abort previous
    if (controllerRef.current) {
      try {
        controllerRef.current.abort();
      } catch {}
      controllerRef.current = null;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setProjectsLoading(true);
    setProjectsError(null);

    try {
      const offset = loadPage * PAGE_SIZE;
      const url = `/api/project?limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!res.ok) {
        let errMsg = `Failed to load projects (status ${res.status})`;
        let destination = null;

        try {
          const j = await res.json();
          if (j?.message) errMsg = j.message;

          if (j?.redirectTo) destination = j.redirectTo;
        } catch(e) {
          console.error(e)
        }

        setProjectsError(errMsg);
        toast.error(errMsg);

        if (destination) {
          const path = destination.startsWith("/")
            ? destination
            : `/${destination}`;
          router.push(path);
        }

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

      setProjects((prev) => (append ? [...prev, ...loaded] : loaded));

      // set hasMore based on server total if provided, otherwise based on page size heuristic
      if (!Array.isArray(data) && typeof data.total === "number") {
        const total = data.total;
        const fetchedSoFar = (loadPage + 1) * PAGE_SIZE;
        setHasMore(fetchedSoFar < total);
      } else {
        setHasMore(loaded.length === PAGE_SIZE);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setProjectsError("Network error while loading projects.");
      toast.error("Network error while loading projects.");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setProjectsLoading(false);
    }
  };

  // initial load or refresh
  useEffect(() => {
    setPage(0);
    loadProjects(0, false);
    // cleanup on unmount
    return () => {
      if (controllerRef.current) {
        try {
          controllerRef.current.abort();
        } catch {}
        controllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, refreshKey, needsRefresh]);

  // wire create callback: close and trigger refetch (keeps logic simple & consistent)
  const onCreate = async (payload: any) => {
    setOpenCreate(false);
    // if modal returns a created project object, we can optimistically prepend it:
    const created: ProjectFromDB | null =
      payload?.project ??
      payload?.createdProject ??
      (payload?.id ? (payload as any) : null);

    if (created && created._id) {
      // prepend new project so user sees it instantly
      setProjects((prev) => [created, ...prev]);
      toast.success("Project created!");
      return;
    }

    // otherwise trigger refetch (resets to page 0)
    toast.success("Project created (refreshing list).");
    setRefreshKey((k) => k + 1);
  };

  const onRequested = (q: QuotePayload) => {
    setQuote(q);
    setQuoteOpen(false);
    toast.success("Quote requested!");
  };

  // computed filtered list based on local in-memory projects
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

  // If there was an error and we're not actively loading, show retry UI
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
              onClick={() => {
                setProjectsError(null);
                setRefreshKey((k) => k + 1);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN UI
  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* header */}
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

      {/* projects grid */}
      <div className="grid grid-cols-1 bp-grid gap-6">
        {projectsLoading && projects.length === 0 ? (
          // initial load skeletons
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

      {/* bottom actions: Refresh + See more projects */}
      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-sm text-gray-500">
          {projects.length} project{projects.length === 1 ? "" : "s"}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshKey((k) => k + 1);
              setPage(0);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border text-black"
          >
            Refresh
            <Activity size={14} />
          </button>

          {/* See more button: only show if there's more to load */}
          {hasMore ? (
            <button
              onClick={async () => {
                // load next page
                const nextPage = page + 1;
                setPage(nextPage);
                await loadProjects(nextPage, true);
              }}
              disabled={projectsLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border hover:bg-gray-50 text-black"
            >
              {projectsLoading ? (
                <>
                  <Activity size={14} className="animate-spin" /> Loading...
                </>
              ) : (
                "See more projects"
              )}
            </button>
          ) : (
            // if not loading and no more pages, show subtle text
            <div className="text-xs text-gray-400">
              No more projects to load
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .bp-header {
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .actions > * {
          flex: 0 1 auto;
        }

        @media (min-width: 980px) {
          .bp-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .bp-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .bp-grid {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}
