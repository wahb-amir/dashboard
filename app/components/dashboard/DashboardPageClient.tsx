"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // server-provided initial data
  initialUser?: AuthTokenPayload | null;
  initialProjects?: ProjectFromDB[];
  initialPage?: number;
  initialHasMore?: boolean;
  initialQuery?: string;

  // client-only flags
  user?: AuthTokenPayload | null; // kept for backward compatibility
  needsRefresh?: boolean;
}

// keep PAGE_SIZE outside the component so it doesn't cause re-creation
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

  // prefer server-provided user if available, otherwise fall back to prop user
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

  // master list of loaded projects (pages appended here)
  const [projects, setProjects] = useState<ProjectFromDB[]>(initialProjects);
  // what we show in the UI (either filtered local projects or remote search results)
  const [displayed, setDisplayed] = useState<ProjectFromDB[]>(initialProjects);

  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialPage); // 0-based
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);

  // query state (start from server provided query if any)
  const [query, setQuery] = useState(initialQuery);

  // refs for aborting and debounce
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // search cache for remote queries
  const remoteCache = useRef<Record<string, ProjectFromDB[]>>({});

  // store latest query in a ref so loadProjects can use it without being re-created
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Build a lightweight title index for fast local search. Recompute only when projects change.
  const titleIndex = useMemo(() => {
    // list of { id, titleLower } for O(n) scan with minimal allocations
    return projects.map((p) => ({
      id: p._id ?? (p as any).id ?? "",
      titleLower: (p.title ?? "").toLowerCase(),
    }));
  }, [projects]);

  const onCreate = async (payload: any) => {
    await new Promise((res) => setTimeout(res, 700));
    console.log("Create:", payload);
    toast.success("Project created!");
    // refresh first page
    setPage(0);
    // clear master list and re-fetch first page
    setProjects([]);
    await loadProjects(0, false);
  };
  const onRequested = async (q: QuotePayload) => {
    setQuote(q);
  };

  // optional: keep server/session fresh if needsRefresh toggles
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

  // loadProjects is stable via useCallback and reads query via queryRef
  const loadProjects = useCallback(
    async (loadPage = 0, append = false, q?: string) => {
      // abort any in-flight request that was initiated by loadProjects
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

        // update displayed only when there's no active query (i.e. show local data)
        if (!queryRef.current) {
          setDisplayed((prev) => (append ? [...prev, ...loaded] : loaded));
        }

        // determine hasMore:
        if (!Array.isArray(data) && typeof data.total === "number") {
          const total = data.total;
          const fetchedSoFar = (loadPage + 1) * PAGE_SIZE;
          setHasMore(fetchedSoFar < total);
        } else {
          setHasMore(
            loaded.length === PAGE_SIZE || (append && loaded.length > 0)
          );
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setProjectsError("Network error while loading projects.");
        toast.error("Network error while loading projects.");
      } finally {
        // only clear loading if this controller is still the current one
        if (controllerRef.current === controller) controllerRef.current = null;
        setProjectsLoading(false);
      }
    },
    []
  );

  // initial load: only when needsRefresh toggles true OR when we have no initial projects
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0 && !needsRefresh) {
      // we already have server-provided projects — no fetch on mount
      return;
    }

    setPage(0);
    // pass current query explicitly (likely empty on mount)
    loadProjects(0, false, queryRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRefresh]);

  // FAST LOCAL TITLE SEARCH: only search titles in-memory using the precomputed titleIndex.
  // This keeps the local search extremely fast for large lists and avoids allocations.
  const performLocalFirstSearch = useCallback(
    async (q: string) => {
      const term = (q || "").trim().toLowerCase();

      if (!term) {
        // empty query -> show master list
        setDisplayed(projects);
        return;
      }

      // 1) Fast prefix matches on title (very cheap)
      const prefixMatches: ProjectFromDB[] = [];
      for (let i = 0; i < titleIndex.length; i++) {
        const ti = titleIndex[i];
        if (ti.titleLower.startsWith(term)) {
          const proj = projects[i];
          if (proj) prefixMatches.push(proj);
          if (prefixMatches.length >= 50) break; // limit results
        }
      }

      if (prefixMatches.length > 0) {
        setDisplayed(prefixMatches);
        return;
      }

      // 2) If no prefix hits, do contains-in-title (still fast)
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

      // 3) No local title matches. Only query backend if there are more pages to search.
      if (!hasMore) {
        // no more pages and no local match -> show empty
        setDisplayed([]);
        return;
      }

      // check cache
      if (remoteCache.current[term]) {
        setDisplayed(remoteCache.current[term]);
        return;
      }

      // otherwise call backend search (page 0)
      setProjectsLoading(true);
      try {
        const controller = new AbortController();
        // abort previous remote search if any
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

        // cache and display
        remoteCache.current[term] = loaded;
        setDisplayed(loaded);

        // if the remote search returned PAGE_SIZE results, there might still be more — keep hasMore true
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

  // when query changes, debounce and run local-first search
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

  // cleanup on unmount
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

  // load more handler — loads next page and appends to master list
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    // fetch page and append to master list
    await loadProjects(nextPage, true);
    // when there's no active query, also append to displayed
    if (!queryRef.current) {
      setDisplayed((prev) => {
        // append the newly loaded items from projects (safe because loadProjects appended to projects state)
        return [...projects, ...projects.slice(prev.length)];
      });
    }
  };

  // prevent unnecessary renders: update queryRef on input quickly but set state once
  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    // update both state and ref — state drives UI, ref used by fetch
    setQuery(v);
    queryRef.current = v;
  }

  if (!currentUser && failed) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-black">Unable to load account.</div>
        <div className="mt-2 text-sm text-gray-600">Something went wrong while fetching your session. You can retry.</div>
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* header */}
      <header className="px-4 py-4 border-b bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black">Projects</h1>
              <p className="text-sm text-gray-700">Overview of ongoing work and quick actions.</p>
            </div>

            {/* search + create (stacked on mobile) */}
            <div className="w-full sm:w-auto flex items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                      // perform immediate search
                      performLocalFirstSearch(queryRef.current);
                    }
                  }}
                  className="pl-10 pr-3 py-2 rounded-md border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder:text-gray-500 w-full"
                />
              </div>

              <CreateProjectModal open={open} onClose={() => setOpen(false)} onCreate={onCreate} />
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
                <h3 className="text-sm font-semibold mb-2 text-black">Quick Actions</h3>
                <p className="text-xs text-gray-600 mb-3">Common tasks at your fingertips.</p>

                <div className="flex flex-col gap-2">
                  <button onClick={() => setModalOpen(true)} className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border hover:bg-gray-100 bg-transparent transition-all ">
                    <span className="text-gray-900">Request a New Quote</span>
                    <ChevronRight size={16} />
                  </button>
                  <GetQuoteModal open={modalOpen} onClose={() => setModalOpen(false)} onRequested={onRequested} />
                  <button onClick={() => setOpen(true)} className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-blue-600 text-white transition">
                    <span>Create Project</span>
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-4">
                <LiveChat userEmail={currentUser?.email ?? null} userName={currentUser?.name ?? currentUser?.email ?? "You"} />
              </div>
            </aside>
            <section className="lg:col-span-2 flex flex-col gap-4">
              {projectsLoading ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full">...</div>
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full">...</div>
                  <div className="bg-white rounded-lg shadow-sm border p-5 animate-pulse max-w-full">...</div>
                </div>
              ) : displayed.length === 0 ? (
                <div className="bg-white p-4 rounded border text-black">{projectsError ? projectsError : "No projects found."}</div>
              ) : (
                <>
                  <div className="space-y-4">
                    {displayed.map((p) => (
                      <div key={p._id ?? (p as any).id} className="project-item">
                        <ProjectCard project={p} currentUser={currentUser} onView={(id) => router.push(`/dashboard/projects/${id}`)} />
                      </div>
                    ))}
                  </div>

                  {/* load more area — only show when not actively searching remotely */}
                  {!queryRef.current && (
                    <div className="pt-4">
                      {hasMore ? (
                        <div className="flex justify-center">
                          <button onClick={handleLoadMore} disabled={projectsLoading} className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50 text-sm">
                            {projectsLoading ? "Loading..." : `See next ${PAGE_SIZE} projects`}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-gray-500">No more projects</div>
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
