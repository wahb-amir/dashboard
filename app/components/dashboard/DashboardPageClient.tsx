"use client";

import React, { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { AuthTokenPayload } from "@/app/utils/token";
import {
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  PauseCircle,
  Activity,
  MessageSquare,
  GitCommit,
} from "lucide-react";
import LiveChat from "../LiveChat";
interface Props {
  user: AuthTokenPayload | null;
  needsRefresh: boolean;
}

type Project = {
  id: string;
  title: string;
  client: string;
  description: string;
  progress: number; // 0-100
  status: "In Progress" | "On Hold" | "Completed";
};

type ActivityItem =
  | {
      type: "message";
      id: string;
      author: string;
      content: string;
      time: string;
    }
  | {
      type: "commit";
      id: string;
      author: string;
      message: string;
      time: string;
    };

export default function DashboardPageClient({ user, needsRefresh }: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthTokenPayload | null>(user);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);

  // session refresh logic (kept from your original)
  useEffect(() => {
    if (!needsRefresh) return;
    if (loading) return;

    const controller = new AbortController();
    let cancelled = false;

    async function rotate() {
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
          toast.error("Session refresh failed. Please sign in again.");
          setCurrentUser(null);
          return;
        }

        const data = await res.json().catch(() => null);
        if (data && data.user) {
          setCurrentUser(data.user);
          toast.success("Session refreshed");
        } else if (data && data.auth) {
          setCurrentUser(data);
          toast.success("Session refreshed");
        } else {
          toast.error("Failed to refresh session — please sign in.");
          setCurrentUser(null);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        toast.error("Network error while refreshing session");
        if (!cancelled && retryCount < 2) setRetryCount((c) => c + 1);
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

  // --- Demo / static data (replace with real API data as needed) ---
  const projects: Project[] = useMemo(
    () => [
      {
        id: "ecom-001",
        title: "E-commerce Platform",
        client: "Innovate Inc.",
        description:
          "Developing a new online marketplace with Next.js and MongoDB.",
        progress: 75,
        status: "In Progress",
      },
      {
        id: "mobile-002",
        title: "Mobile App Redesign",
        client: "Creative Solutions",
        description:
          "Redesigning the user interface and experience for the iOS and Android apps.",
        progress: 30,
        status: "On Hold",
      },
      {
        id: "marketing-003",
        title: "Marketing Website",
        client: "Growth Co.",
        description:
          "New responsive marketing website to boost online presence.",
        progress: 100,
        status: "Completed",
      },
    ],
    []
  );

  const [query, setQuery] = useState("");
  const filtered = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.client.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
  );

  

  // --- UI helpers ---
  function statusBadge(status: Project["status"]) {
    if (status === "Completed")
      return (
        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={14} /> Completed
        </span>
      );
    if (status === "On Hold")
      return (
        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <PauseCircle size={14} /> On Hold
        </span>
      );
    return (
      <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
        <Clock size={14} /> In Progress
      </span>
    );
  }

  if (!currentUser && loading) {
    return (
      <div aria-live="polite" className="p-4">
        Loading session…
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-black">
          Unable to load account. Please sign in.
        </div>
        <div className="mt-3">
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white"
          >
            Retry
            <Activity size={16} />
          </button>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black">Projects</h1>
          <p className="text-sm text-black">
            Overview of ongoing work and quick actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800"
            />
            <input
              type="search"
              aria-label="Search projects"
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-3 py-2 rounded-md border bg-white shadow-sm w-[220px] md:w-[320px] focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <button
            onClick={() => router.push("/dashboard/projects/new")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white font-semibold hover:brightness-95 transition"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Projects list (spans 2 columns on large screens) */}
        <section className="lg:col-span-2 space-y-4">
          {filtered.map((p) => (
            <article
              key={p.id}
              className="bg-white rounded-lg shadow-sm border p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-black">
                        {p.title}
                      </h2>
                      <div className="text-sm text-black ">{p.client}</div>
                    </div>
                    <div>{statusBadge(p.status)}</div>
                  </div>

                  <p className="mt-3 text-sm text-black">{p.description}</p>

                  {/* progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-black">
                      <span>{p.progress}%</span>
                      <span className="font-medium">{p.status}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded mt-2 overflow-hidden">
                      <div
                        className="h-2 rounded bg-gradient-to-r from-blue-400 to-blue-600"
                        style={{
                          width: `${Math.max(0, Math.min(100, p.progress))}%`,
                        }}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-50 transition"
                >
                  View Details <ChevronRight size={14} />
                </button>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="bg-white p-4 rounded border text-black">
              No projects match your search.
            </div>
          )}
        </section>

        {/* Right column: Quick Actions + Live Activity */}
        <aside className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-sm font-semibold mb-2 text-black">
              Quick Actions
            </h3>
            <p className="text-xs text-black mb-3">
              Common tasks at your fingertips.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => router.push("/dashboard/quotes/new")}
                className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border hover:bg-gray-200  bg-transparent transition-all "
              >
                <span className="text-gray-900">Request a New Quote</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => router.push("/dashboard/projects/new")}
                className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:brightness-95 transition"
              >
                <span>Create Project</span>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Live Activity */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-black">
                Live Activity
              </h3>
              <div className="inline-flex items-center text-xs text-gray-500 gap-1">
                <Activity size={14} className="text-gray-800" /> Real-time
              </div>
            </div>

            <div className="h-full">
              <LiveChat
                userEmail={currentUser?.email ?? null}
                userName={currentUser?.name ?? currentUser?.email ?? "You"}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
