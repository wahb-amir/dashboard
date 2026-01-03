"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  initialUser?: AuthTokenPayload | null;
  initialProjects?: ProjectFromDB[];
  initialPage?: number;
  initialHasMore?: boolean;
  initialQuery?: string;
  user?: AuthTokenPayload | null;
  needsRefresh?: boolean;
}

const PAGE_SIZE = 5;

export default function DashboardPageClient({
  initialUser = null,
  initialProjects = [],
  initialPage = 0,
  initialHasMore = true,
  initialQuery = "",
  user = null,
  needsRefresh = false,
}: Props) {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AuthTokenPayload | null>(
    initialUser ?? user
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const MAX_RETRIES = 2;
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState<QuotePayload | null>(null);

  // master list & displayed list
  const [projects, setProjects] = useState<ProjectFromDB[]>(initialProjects);
  const [displayed, setDisplayed] = useState<ProjectFromDB[]>(initialProjects);

  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialPage);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);

  // initial loading state: if server gave projects, skip initial loading skeleton
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(
    Boolean(initialProjects && initialProjects.length > 0)
  );

  const [query, setQuery] = useState(initialQuery);

  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const remoteCache = useRef<Record<string, ProjectFromDB[]>>({});
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const titleIndex = useMemo(() => {
    return projects.map((p) => ({
      id: p._id ?? (p as any).id ?? "",
      titleLower: (p.title ?? "").toLowerCase(),
    }));
  }, [projects]);

  // onCreate: try to use optimistic created project if provided by modal; else re-fetch page 0.
  const onCreate = async (payload: any) => {
    const created: ProjectFromDB | null =
      payload?.project ??
      payload?.createdProject ??
      (payload?.id ? (payload as any) : null);

    if (created && created._id) {
      setProjects((prev) => [created, ...prev]);
      setDisplayed((prev) => [created, ...prev]);
      toast.success("Project created!");
      return;
    }

    queryRef.current = "";
    setQuery("");
    setPage(0);
    setProjects([]);
    setDisplayed([]);
    try {
      await loadProjects(0, false);
      toast.success("Project created!");
    } catch (e) {}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRefresh, retryCount]);

  const loadProjects = useCallback(
    async (
      loadPage = 0,
      append = false,
      q?: string
    ): Promise<ProjectFromDB[]> => {
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

      let loaded: ProjectFromDB[] = [];

      try {
        const offset = loadPage * PAGE_SIZE;
        const usedQuery = typeof q === "string" ? q : queryRef.current;
        const url = `/api/project?limit=${PAGE_SIZE}&offset=${offset}${
          usedQuery ? `&q=${encodeURIComponent(usedQuery)}` : ""
        }`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return [];

        if (!res.ok) {
          let errMsg = `Failed to load projects (status ${res.status})`;
          try {
            const errJson = await res.json();
            if (errJson?.message) errMsg = errJson.message;
          } catch {}
          setProjectsError(errMsg);
          toast.error(errMsg);
          return [];
        }

        const data = await res.json().catch(() => null);
        if (!data) {
          setProjectsError("Invalid project data returned from server.");
          toast.error("Invalid project data returned from server.");
          return [];
        }

        loaded = Array.isArray(data) ? data : data.projects ?? [];

        setProjects((prev) => (append ? [...prev, ...loaded] : loaded));

        if (!queryRef.current) {
          setDisplayed((prev) => (append ? [...prev, ...loaded] : loaded));
        }

        if (!Array.isArray(data) && typeof data.total === "number") {
          const total = data.total;
          const fetchedSoFar = (loadPage + 1) * PAGE_SIZE;
          setHasMore(fetchedSoFar < total);
        } else {
          setHasMore(
            loaded.length === PAGE_SIZE || (append && loaded.length > 0)
          );
        }

        return loaded;
      } catch (err: any) {
        if (err?.name === "AbortError") return [];
        setProjectsError("Network error while loading projects.");
        toast.error("Network error while loading projects.");
        return [];
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null;
        setProjectsLoading(false);
        if (loadPage === 0 && !initialLoadComplete) {
          setInitialLoadComplete(true);
        }
      }
    },
    [initialLoadComplete]
  );

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0 && !needsRefresh) {
      return;
    }

    setPage(0);
    loadProjects(0, false, queryRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRefresh]);

  const performLocalFirstSearch = useCallback(
    async (q: string) => {
      const term = (q || "").trim().toLowerCase();

      if (!term) {
        setDisplayed(projects);
        return;
      }

      const prefixMatches: ProjectFromDB[] = [];
      for (let i = 0; i < titleIndex.length; i++) {
        const ti = titleIndex[i];
        if (ti.titleLower.startsWith(term)) {
          const proj = projects[i];
          if (proj) prefixMatches.push(proj);
          if (prefixMatches.length >= 50) break;
        }
      }

      if (prefixMatches.length > 0) {
        setDisplayed(prefixMatches);
        return;
      }

      const containsMatches: ProjectFromDB[] = [];
      for (let i = 0; i < titleIndex.length; i++) {
        const ti = titleIndex[i];
        if (ti.titleLower.includes(term)) {
          const proj = projects[i];
          if (proj) containsMatches.push(proj);
          if (containsMatches.length >= 50) break;
        }
      }

      if (containsMatches.length > 0) {
        setDisplayed(containsMatches);
        return;
      }

      if (!hasMore) {
        setDisplayed([]);
        return;
      }

      if (remoteCache.current[term]) {
        setDisplayed(remoteCache.current[term]);
        return;
      }

      setProjectsLoading(true);
      try {
        const controller = new AbortController();
        if (controllerRef.current) {
          try {
            controllerRef.current.abort();
          } catch {}
        }
        controllerRef.current = controller;

        const url = `/api/project?limit=${PAGE_SIZE}&offset=0&q=${encodeURIComponent(
          term
        )}`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          let msg = `Failed to search (status ${res.status})`;
          try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {}
          setProjectsError(msg);
          toast.error(msg);
          setDisplayed([]);
          return;
        }

        const data = await res.json().catch(() => null);
        const loaded: ProjectFromDB[] = Array.isArray(data)
          ? data
          : data?.projects ?? [];

        remoteCache.current[term] = loaded;
        setDisplayed(loaded);

        if (!Array.isArray(data) && typeof data.total === "number") {
          setHasMore(data.total > PAGE_SIZE);
        } else {
          setHasMore(loaded.length === PAGE_SIZE);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setProjectsError("Network error while searching projects.");
        toast.error("Network error while searching projects.");
      } finally {
        setProjectsLoading(false);
        if (controllerRef.current) {
          try {
            controllerRef.current.abort();
          } catch {}
          controllerRef.current = null;
        }
      }
    },
    [titleIndex, projects, hasMore]
  );

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = window.setTimeout(() => {
      performLocalFirstSearch(queryRef.current);
      debounceRef.current = null;
    }, 250);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query, performLocalFirstSearch]);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        try {
          controllerRef.current.abort();
        } catch {}
        controllerRef.current = null;
      }
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    const loaded = await loadProjects(nextPage, true);
    if (!queryRef.current && loaded && loaded.length > 0) {
      setDisplayed((prev) => [...prev, ...loaded]);
    }
  };

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    queryRef.current = v;
  }

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

  return (
    // <-- added overflow-hidden here so only `main` shows the scrollbar
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="px-4 py-3 border-b bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-8    ">
            <div>
              <h1 className="text-2xl font-bold text-black -mt-1">Projects</h1>
              <p className="text-sm text-gray-700">
                Overview of ongoing work and quick actions.
              </p>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="search"
                  aria-label="Search projects"
                  placeholder="Search by title..."
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (debounceRef.current) {
                        window.clearTimeout(debounceRef.current);
                        debounceRef.current = null;
                      }
                      performLocalFirstSearch(queryRef.current);
                    }
                  }}
                  className="pl-10 pr-10 py-2 rounded-md border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder:text-gray-500 w-full"
                />
                {projectsLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Activity
                      size={16}
                      className="animate-spin text-gray-500"
                    />
                  </div>
                )}
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

      {/* single scroll container */}
      <main className="flex-1 overflow-y-auto">
        {/* removed h-full here so inner content flows normally into the main scroll */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <aside className="order-first lg:order-last space-y-4">
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
                    className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border hover:bg-gray-100 transition-all bg-transparent"
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

            <section className="lg:col-span-2 flex flex-col gap-4">
              {!initialLoadComplete ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full h-28" />
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full h-28" />
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full h-28" />
                </div>
              ) : projectsLoading && displayed.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full h-28" />
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full h-28" />
                </div>
              ) : projectsError ? (
                <div className="bg-white p-6 rounded border text-black">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        Unable to load projects
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {projectsError}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => {
                          setProjectsError(null);
                          loadProjects(0, false);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
                      >
                        Retry
                        <Activity size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : displayed.length === 0 ? (
                <div className="bg-white p-8 rounded border text-black flex flex-col items-center text-center gap-4">
                  <div className="text-lg font-semibold">No projects found</div>
                  <div className="text-sm text-gray-600">
                    You don't have any projects yet — create your first project
                    to get started.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOpen(true)}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white"
                    >
                      Create Project
                    </button>
                    <button
                      onClick={() => {
                        setQuery("");
                        queryRef.current = "";
                        loadProjects(0, false);
                      }}
                      className="px-4 py-2 rounded-md border"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {displayed.map((p) => (
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

                  {!queryRef.current && (
                    <div className="pt-4">
                      {hasMore ? (
                        <div className="flex justify-center">
                          <button
                            onClick={handleLoadMore}
                            disabled={projectsLoading}
                            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm inline-flex items-center gap-2 text-black"
                          >
                            {projectsLoading ? (
                              <>
                                <Activity size={14} className="animate-spin" />{" "}
                                Loading...
                              </>
                            ) : (
                              `See more projects`
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-gray-500">
                          No more projects
                        </div>
                      )}
                    </div>
                  )}
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
