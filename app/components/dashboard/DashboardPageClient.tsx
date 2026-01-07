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
  user?: AuthTokenPayload | null; // Consolidated user prop in logic below
  needsRefresh?: boolean;
}

// MATCHED SERVER CONSTANT
const PAGE_SIZE = 6;

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

  // Consolidate user props
  const [currentUser, setCurrentUser] = useState<AuthTokenPayload | null>(
    initialUser ?? user
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const [failed, setFailed] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false); // Quote Modal
  const [createModalOpen, setCreateModalOpen] = useState(false); // Create Project Modal
  const [quote, setQuote] = useState<QuotePayload | null>(null);

  const MAX_RETRIES = 2;

  // State: Master list (projects) vs Displayed list (filtered)
  const [projects, setProjects] = useState<ProjectFromDB[]>(initialProjects);
  const [displayed, setDisplayed] = useState<ProjectFromDB[]>(initialProjects);

  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(initialPage);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);

  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(
    Boolean(initialProjects && initialProjects.length > 0)
  );

  const [query, setQuery] = useState(initialQuery);

  // Refs
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const remoteCache = useRef<Record<string, ProjectFromDB[]>>({});
  const queryRef = useRef(query);

  // Sync ref with state
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Index for local search
  const titleIndex = useMemo(() => {
    return projects.map((p) => ({
      id: p._id ?? (p as any).id ?? "",
      titleLower: (p.title ?? "").toLowerCase(),
    }));
  }, [projects]);

  // --- HANDLERS ---

  const onCreate = async (payload: any) => {
    const created: ProjectFromDB | null =
      payload?.project ??
      payload?.createdProject ??
      (payload?.id ? (payload as any) : null);

    if (created && created._id) {
      setProjects((prev) => [created, ...prev]);

      // Only prepend to displayed if we aren't currently searching
      if (!queryRef.current) {
        setDisplayed((prev) => [created, ...prev]);
      }

      toast.success("Project created!");
      return;
    }

    // Fallback: Refresh list
    queryRef.current = "";
    setQuery("");
    setPage(0);
    try {
      const fresh = await loadProjects(0, false, "");
      setProjects(fresh);
      setDisplayed(fresh);
      toast.success("Project created!");
    } catch (e) {}
  };

  const onRequested = async (q: QuotePayload) => {
    setQuote(q);
  };

  // --- AUTH REFRESH LOGIC ---
  useEffect(() => {
    if (!needsRefresh || loading) return;

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
          toast.error("Session expired.");
          router.push("/login?reason=session_expired");
          return;
        }

        if (!res.ok) throw new Error("Refresh failed");

        const data = await res.json().catch(() => null);

        if (data?.user || data?.auth) {
          setCurrentUser(data.user || data);
          toast.success("Session refreshed");
        } else {
          throw new Error("Invalid data");
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (retryCount < MAX_RETRIES) {
          setRetryCount((c) => c + 1);
        } else {
          setFailed(true);
          setCurrentUser(null);
          // Only show toast on final failure to avoid spamming
          toast.error("Session refresh failed.");
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
  }, [needsRefresh, retryCount, loading, router]); // Added missing deps

  // --- PROJECT FETCH LOGIC ---
  const loadProjects = useCallback(
    async (
      loadPage = 0,
      append = false,
      q?: string
    ): Promise<ProjectFromDB[]> => {
      if (controllerRef.current) controllerRef.current.abort();

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

        if (controller.signal.aborted) return [];

        if (!res.ok) throw new Error(`Status ${res.status}`);

        const data = await res.json();
        const loaded: ProjectFromDB[] = Array.isArray(data)
          ? data
          : data.projects ?? [];

        // If we are just appending to the master list (Load More)
        if (append && !usedQuery) {
          setProjects((prev) => [...prev, ...loaded]);
          setDisplayed((prev) => [...prev, ...loaded]);
        }
        // If we are replacing (Initial load or Search)
        else if (!append) {
          // If this is a search result, we typically don't update the master 'projects' list
          // unless you want to cache search results.
          // Logic here: if no query, update master. If query, only update displayed.
          if (!usedQuery) {
            setProjects(loaded);
          }
          setDisplayed(loaded);
        }

        // Has More Logic
        if (!Array.isArray(data) && typeof data.total === "number") {
          const total = data.total;
          const fetchedSoFar = (loadPage + 1) * PAGE_SIZE;
          setHasMore(fetchedSoFar < total);
        } else {
          // Fallback if API doesn't return total
          setHasMore(loaded.length === PAGE_SIZE);
        }

        return loaded;
      } catch (err: any) {
        if (err?.name === "AbortError") return [];
        setProjectsError(err.message || "Error loading projects");
        toast.error("Network error loading projects");
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

  // Initial Client Load (if needed)
  useEffect(() => {
    if (initialProjects && initialProjects.length > 0 && !needsRefresh) return;

    // Only fetch if we don't have server data
    setPage(0);
    loadProjects(0, false, queryRef.current);
  }, [needsRefresh]); // Removed other deps to prevent infinite loops

  // --- SEARCH LOGIC ---
  const performLocalFirstSearch = useCallback(
    async (q: string) => {
      const term = (q || "").trim().toLowerCase();

      // 1. Empty Search: Reset to master list
      if (!term) {
        setDisplayed(projects);
        return;
      }

      // 2. Local Prefix Match
      const prefixMatches = projects.filter((p) =>
        (p.title || "").toLowerCase().startsWith(term)
      );
      if (prefixMatches.length > 0) {
        setDisplayed(prefixMatches);
        return;
      }

      // 3. Local Contains Match
      const containsMatches = projects.filter((p) =>
        (p.title || "").toLowerCase().includes(term)
      );
      if (containsMatches.length > 0) {
        setDisplayed(containsMatches);
        return;
      }

      // 4. Remote Search (if local failed)
      // Note: If 'hasMore' is true, local search might be incomplete, so we go remote.
      if (!hasMore && projects.length > 0) {
        // If we have all projects loaded locally (hasMore is false) and found nothing,
        // then the item truly doesn't exist.
        setDisplayed([]);
        return;
      }

      // Check Cache
      if (remoteCache.current[term]) {
        setDisplayed(remoteCache.current[term]);
        return;
      }

      // Fetch Remote
      await loadProjects(0, false, term);
      // Note: loadProjects handles setting 'displayed'
    },
    [projects, hasMore, loadProjects]
  );

  // Debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      performLocalFirstSearch(queryRef.current);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performLocalFirstSearch]);

  // --- RENDER HELPERS ---

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadProjects(nextPage, true);
  };

  if (!currentUser && failed) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-black">
          Unable to load account.
        </div>
        <button
          onClick={() => {
            setFailed(false);
            setRetryCount((c) => c + 1);
          }}
          className="mt-4 px-3 py-2 bg-blue-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // Skeleton UI
  if (!currentUser && !failed) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="px-4 py-3 border-b bg-white animate-pulse">
          <div className="max-w-7xl mx-auto h-12 bg-gray-200 rounded" />
        </header>
        <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
          <aside className="order-first lg:order-last space-y-4">
            <div className="bg-white rounded-lg shadow-sm border p-4 h-48 animate-pulse" />
            <div className="bg-white rounded-lg shadow-sm border p-4 h-48 animate-pulse" />
          </aside>
          <section className="lg:col-span-2 space-y-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="h-40 bg-white rounded shadow animate-pulse"
              />
            ))}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="px-4 py-3 border-b bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-black -mt-1">Projects</h1>
            <p className="text-sm text-gray-700">Overview of ongoing work.</p>
          </div>
          <div className="w-full sm:w-auto flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="search"
                placeholder="Search by title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md border w-full text-black "
              />
              {projectsLoading && (
                <Activity
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
                />
              )}
            </div>
            <CreateProjectModal
              open={createModalOpen}
              onClose={() => setCreateModalOpen(false)}
              onCreate={onCreate}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <aside className="order-first lg:order-last space-y-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="font-semibold mb-2 text-black">Quick Actions</h3>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full flex justify-between px-3 py-2 border rounded mb-2 hover:bg-gray-50 text-black"
              >
                Request Quote <ChevronRight size={16} />
              </button>
              <GetQuoteModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onRequested={onRequested}
              />

              <button
                onClick={() => setCreateModalOpen(true)}
                className="w-full flex justify-between px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Project <Plus size={16} />
              </button>
            </div>
            <LiveChat
              userEmail={currentUser?.email ?? null}
              userName={currentUser?.name ?? "You"}
            />
          </aside>

          {/* Project List */}
          <section className="lg:col-span-2 space-y-4">
            {projectsError && (
              <div className="bg-red-50 text-red-600 p-4 rounded border border-red-200">
                {projectsError}
                <button
                  onClick={() => loadProjects(0, false)}
                  className="ml-4 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {displayed.length === 0 && !projectsLoading ? (
              <div className="text-center py-10 text-gray-500">
                No projects found.
              </div>
            ) : (
              displayed.map((p) => (
                <ProjectCard
                  key={p._id ?? (p as any).id}
                  project={p}
                  currentUser={currentUser}
                  onView={(id) => router.push(`/dashboard/projects/${id}`)}
                />
              ))
            )}

            {/* Load More Button */}
            {hasMore && !query && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={projectsLoading}
                  className="px-4 py-2 border bg-white rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  {projectsLoading ? "Loading..." : "See more projects"}
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
