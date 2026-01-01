"use client";

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { AuthTokenPayload } from "@/app/utils/token";
import CreateProjectModal from "../Projects/CreateProjectModal";
import GetQuoteModal, {
  QuotePayload,
} from "@/app/components/Quote/GetQuoteModal";
import { Plus, Search, Activity, ChevronRight } from "lucide-react";
import LiveChat from "../LiveChat";
import ProjectCard, {
  ProjectFromDB,
} from "@/app/components/Projects/ProjectCard";

interface Props {
  user: AuthTokenPayload | null;
  needsRefresh: boolean;
}

export default function DashboardPageClient({ user, needsRefresh }: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthTokenPayload | null>(user);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const MAX_RETRIES = 2;
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<QuotePayload | null>(null);

  // pagination state
  const PAGE_SIZE = 5;
  const [projects, setProjects] = useState<ProjectFromDB[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0); // 0-based
  const [hasMore, setHasMore] = useState<boolean>(true);

  // *** MOVE query state ABOVE useEffect that depends on it (fixes the crash) ***
  const [query, setQuery] = useState("");

  const onCreate = async (payload: any) => {
    await new Promise((res) => setTimeout(res, 700));
    console.log("Create:", payload);
    toast.success("Project created!");
    // refresh first page
    setPage(0);
    loadProjects(0, false);
  };
  const onRequested = async (q: QuotePayload) => {
    setQuote(q);
  };

  useEffect(() => {
    if (!needsRefresh) return;
    if (loading) return;

    const controller = new AbortController();
    let cancelled = false;

    async function rotate() {
      setFailed(false);
      setLoading(true);

      try {
        const res = await fetch("/api/auth/checkauth", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (controller.signal.aborted || cancelled) return;

        if (res.status === 401) {
          setCurrentUser(null);
          toast.error("Session expired. Please sign in again.");
          router.push("/login?reason=session_expired");
          return;
        }

        if (!res.ok) {
          if (retryCount < MAX_RETRIES) {
            setRetryCount((c) => c + 1);
          } else {
            setFailed(true);
            setCurrentUser(null);
            toast.error("Session refresh failed after multiple attempts.");
          }
          return;
        }

        const data = await res.json().catch(() => null);
        if (!data) {
          if (retryCount < MAX_RETRIES) {
            setRetryCount((c) => c + 1);
          } else {
            setFailed(true);
            setCurrentUser(null);
            toast.error("Session refresh returned invalid data.");
          }
          return;
        }

        if (data && data.user) {
          setCurrentUser(data.user);
          toast.success("Session refreshed");
        } else if (data && data.auth) {
          setCurrentUser(data);
          toast.success("Session refreshed");
        } else {
          if (retryCount < MAX_RETRIES) {
            setRetryCount((c) => c + 1);
          } else {
            setFailed(true);
            setCurrentUser(null);
            toast.error("Failed to refresh session — please sign in.");
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (retryCount < MAX_RETRIES) {
          setRetryCount((c) => c + 1);
        } else {
          setFailed(true);
          setCurrentUser(null);
          toast.error("Network error while refreshing session");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    rotate();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [needsRefresh, retryCount]);

  // load projects with pagination
  // offset-based: offset = page * PAGE_SIZE
  async function loadProjects(loadPage = 0, append = false) {
    setProjectsLoading(true);
    setProjectsError(null);

    const controller = new AbortController();
    try {
      const offset = loadPage * PAGE_SIZE;
      const url = `/api/project?limit=${PAGE_SIZE}&offset=${offset}${
        query ? `&q=${encodeURIComponent(query)}` : ""
      }`;
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

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

      // Accept either an array or { projects: [...], total?: number }
      const loaded: ProjectFromDB[] = Array.isArray(data)
        ? data
        : data.projects ?? [];

      // if append, concat; otherwise replace
      setProjects((prev) => (append ? [...prev, ...loaded] : loaded));

      // determine hasMore:
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
      setProjectsLoading(false);
    }
  }

  // initial load: page 0 (and whenever currentUser/needsRefresh changes)
  useEffect(() => {
    setPage(0);
    loadProjects(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, needsRefresh]);

  // when query changes, reset to first page and fetch filtered results from backend
  useEffect(() => {
    // debounce simple implementation could be added; keeping immediate
    setPage(0);
    loadProjects(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const SkeletonProjectCard = () => (
    <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full">
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
            <div className="h-3 bg-gray-100 rounded w-2/3" />
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

  if (!currentUser && failed) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-black">
          Unable to load account.
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Something went wrong while fetching your session. You can retry.
        </div>
        <div className="mt-4">
          <button
            onClick={() => {
              setFailed(false);
              setRetryCount((c) => c + 1);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
          >
            Retry
            <Activity size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser && !failed) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-4 w-80 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 bp-skel-grid gap-4 mt-6">
            <div className="h-40 bg-white rounded-lg shadow-sm border p-4" />
            <div className="h-40 bg-white rounded-lg shadow-sm border p-4" />
            <div className="h-40 bg-white rounded-lg shadow-sm border p-4" />
          </div>
        </div>
      </div>
    );
  }

  // load more handler
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadProjects(nextPage, true);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* header */}
      <header className="px-4 py-4 border-b bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">Projects</h1>
              <p className="text-sm text-gray-700">
                Overview of ongoing work and quick actions.
              </p>
            </div>

            {/* search + create (stacked on mobile) */}
            <div className="w-full sm:w-auto flex items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="search"
                  aria-label="Search projects"
                  placeholder="Search projects..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-3 py-2 rounded-md border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder:text-gray-500 w-full"
                />
              </div>

              <CreateProjectModal
                open={open}
                onClose={() => setOpen(false)}
                onCreate={onCreate}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto h-full px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Aside (quick actions) */}
            <aside className="order-first lg:order-last space-y-4 h-auto">
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-semibold mb-2 text-black">
                  Quick Actions
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Common tasks at your fingertips.
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border hover:bg-gray-100 bg-transparent transition-all "
                  >
                    <span className="text-gray-900">Request a New Quote</span>
                    <ChevronRight size={16} />
                  </button>
                  <GetQuoteModal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onRequested={onRequested}
                  />
                  <button
                    onClick={() => setOpen(true)}
                    className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-blue-600 text-white transition"
                  >
                    <span>Create Project</span>
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <LiveChat
                  userEmail={currentUser?.email ?? null}
                  userName={currentUser?.name ?? currentUser?.email ?? "You"}
                />
              </div>
            </aside>

            {/* Projects - NO forced scrollbars; only 5 items per page, user clicks to load more */}
            <section className="lg:col-span-2 flex flex-col gap-4">
              {projectsLoading ? (
                <div className="space-y-4">
                  <SkeletonProjectCard />
                  <SkeletonProjectCard />
                  <SkeletonProjectCard />
                </div>
              ) : projects.length === 0 ? (
                <div className="bg-white p-4 rounded border text-black">
                  {projectsError ? projectsError : "No projects found."}
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {projects.map((p) => (
                      <div
                        key={p._id ?? (p as any).id}
                        className="project-item"
                      >
                        <ProjectCard
                          project={p}
                          currentUser={currentUser}
                          onView={(id) =>
                            router.push(`/dashboard/projects/${id}`)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {/* load more area */}
                  <div className="pt-4">
                    {hasMore ? (
                      <div className="flex justify-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={projectsLoading}
                          className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm"
                        >
                          {projectsLoading
                            ? "Loading..."
                            : `See next ${PAGE_SIZE} projects`}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-500">
                        No more projects
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <style jsx>{`
        .project-item {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
