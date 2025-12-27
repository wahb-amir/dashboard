"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { AuthTokenPayload } from "@/app/utils/token";

interface Props {
  user: AuthTokenPayload | null;
  needsRefresh: boolean;
}

export default function DashboardPageClient({ user, needsRefresh }: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthTokenPayload | null>(user);
  const [loading, setLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0); // small backoff-friendly helper

  useEffect(() => {
    // Only run when explicitly asked to refresh
    if (!needsRefresh) return;
    // Avoid re-entrancy if already running
    if (loading) return;

    const controller = new AbortController();
    let cancelled = false;

    async function rotate() {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/checkauth", {
          method: "GET", // or POST if your API expects it
          credentials: "include", // IMPORTANT: send cookies
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        // If request was aborted, stop silently
        if (controller.signal.aborted || cancelled) return;

        if (res.status === 401) {
          // Unauthorized — session gone/expired
          setCurrentUser(null);
          toast.error("Session expired. Please sign in again.");
          // Optionally redirect to login and stop further work
          router.push("/login?reason=session_expired");
          return;
        }

        if (!res.ok) {
          // treat other non-2xx as failure
          console.error(
            "rotate failed:",
            res.status,
            await res.text().catch(() => "")
          );
          toast.error("Session refresh failed. Please sign in again.");
          setCurrentUser(null);
          return;
        }

        // parse payload safely
        const data = await res.json().catch(() => null);
        if (data && data.user) {
          setCurrentUser(data.user);
          toast.success("Session refreshed");
        } else if (data && data.auth) {
          // in case your API returns a different shape
          setCurrentUser(data);
          toast.success("Session refreshed");
        } else {
          // Unexpected shape
          console.warn("rotate returned unexpected payload:", data);
          toast.error("Failed to refresh session — please sign in.");
          setCurrentUser(null);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // expected on cleanup
          console.debug("rotate aborted");
          return;
        }
        console.error("Rotate error:", err);
        toast.error("Network error while refreshing session");
        // small automatic retry attempt (optional)
        if (!cancelled && retryCount < 2) {
          setRetryCount((c) => c + 1);
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
  }, [needsRefresh, retryCount]); // retryCount allows a tiny automatic retry loop

  if (!currentUser && loading) {
    return <div aria-live="polite">Loading session…</div>;
  }

  if (!currentUser) {
    // Fallback UI. Provide a small retry button to let user try again manually.
    return (
      <div>
        <div>Unable to load account. Please sign in.</div>
        <div className="mt-2">
          <button
            onClick={() => {
              // cause a manual retry by bumping retryCount
              setRetryCount((c) => c + 1);
            }}
            className="inline-flex items-center px-3 py-1 rounded-md bg-blue-600 text-white"
          >
            Try refreshing session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {currentUser.name}</h1>
      <p>Your dashboard content goes here lore.</p>
    </div>
  );
}
