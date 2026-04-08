"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion"; // Fixed import

type FormState = {
  email: string;
  password: string;
};

const APP_TOKEN_URL = "/api/auth/app_token";
const MAX_RETRIES = 3;
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const REFRESH_BEFORE_MS = 60 * 1000;
const STORAGE_KEY = "appToken_record";

// --- Token Management Utilities ---
function setSessionToken(token: string, ttlMs = DEFAULT_TTL_MS) {
  try {
    if (typeof window === "undefined") return;
    const record = { token, expiry: Date.now() + ttlMs };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.error("Failed to set session token", e);
  }
}

function getSessionTokenRecord(): { token: string; expiry: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec.token !== "string" || typeof rec.expiry !== "number") return null;
    if (Date.now() > rec.expiry) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return rec;
  } catch {
    return null;
  }
}

function removeSessionToken() {
  try {
    if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [loadingApp, setLoadingApp] = useState(true);
  const [appToken, setAppToken] = useState<string | null>(null);
  const fetchingRef = useRef<Promise<string | null> | null>(null);

  // Sync token state on mount
  useEffect(() => {
    const rec = getSessionTokenRecord();
    if (rec) setAppToken(rec.token);
    setLoadingApp(false);
  }, []);

  // Handle URL params for error messages
  useEffect(() => {
    const reason = params.get("reason");
    if (reason === "auth") {
      toast.error("Session required. Please log in.");
    } else if (reason === "2fa-required") {
      toast.error("Verification required.");
    }
  }, [params]);

  async function fetchAppTokenOnce(): Promise<{ token: string; ttlMs?: number } | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 250));
        const res = await fetch(APP_TOKEN_URL, {
          method: "GET",
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        let ttlMs: number | undefined;
        if (data.expires_in) ttlMs = data.expires_in * 1000;
        return { token: data.token, ttlMs };
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) return null;
      }
    }
    return null;
  }

  async function ensureValidAppToken(): Promise<string | null> {
    if (fetchingRef.current) return fetchingRef.current;
    const promise = (async () => {
      setLoadingApp(true);
      try {
        const rec = getSessionTokenRecord();
        if (rec && (rec.expiry - Date.now() > REFRESH_BEFORE_MS)) {
          setAppToken(rec.token);
          return rec.token;
        }
        const result = await fetchAppTokenOnce();
        if (!result) {
          removeSessionToken();
          setAppToken(null);
          return null;
        }
        setSessionToken(result.token, result.ttlMs ?? DEFAULT_TTL_MS);
        setAppToken(result.token);
        return result.token;
      } finally {
        setLoadingApp(false);
        fetchingRef.current = null;
      }
    })();
    fetchingRef.current = promise;
    return promise;
  }

  function validate(): boolean {
    const e: { email?: string; password?: string } = {};
    if (!form.email.trim()) e.email = "Email required";
    if (!form.password) e.password = "Password required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    const token = await ensureValidAppToken();
    if (!token) {
      toast.error("Security handshake failed. Please refresh.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Authenticating...");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-token": token },
        body: JSON.stringify(form),
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data?.require2FA) {
          router.push("/device-verification");
          return;
        }
        throw new Error(data?.message || "Login failed.");
      }

      toast.success("Identity verified.", { id: toastId });
      window.dispatchEvent(new Event("auth-change"));
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-stone-900 selection:bg-teal-900 selection:text-teal-50">
      <Toaster position="bottom-right" />

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-10 text-center">
            <Link href="/" className="mb-8 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-colors">
              ← Back to Portal
            </Link>
            <h1 className="font-serif text-[42px] font-normal tracking-tight text-stone-950">
              Welcome <em className="italic text-teal-800">back.</em>
            </h1>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border-b border-stone-200 bg-transparent py-2 text-[15px] font-light outline-none transition-colors focus:border-teal-600"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">Password</label>
                  <Link href="/forgot" className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400 hover:text-stone-900">Forgot?</Link>
                </div>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border-b border-stone-200 bg-transparent py-2 text-[15px] font-light outline-none transition-colors focus:border-teal-600"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || loadingApp}
                className="group relative w-full overflow-hidden rounded-full bg-stone-950 py-3.5 text-[14px] font-medium text-stone-50 transition duration-300 hover:bg-teal-900 disabled:opacity-50"
              >
                <span className="relative z-10">
                  {loadingApp ? "Syncing App Token..." : loading ? "Authenticating..." : "Sign in to Dashboard"}
                </span>
              </button>
            </form>

            <div className="mt-8 border-t border-stone-100 pt-6 text-center">
              <p className="text-[13px] font-light text-stone-500">
                New to the portal?{" "}
                <Link href="/register" className="font-medium text-stone-900 underline decoration-stone-200 underline-offset-4 hover:decoration-teal-600">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}