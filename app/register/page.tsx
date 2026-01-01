"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import FloatingLabel from "../components/ui/FloatingLabel";

type FormState = {
  name: string;
  company: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
};

const APP_TOKEN_URL = "/api/auth/app_token";
const REGISTER_URL = "/api/auth/register";
const MAX_RETRIES = 3;
// default TTL if server doesn't provide one: 30 minutes
const DEFAULT_TTL_MS = 30 * 60 * 1000;
// refresh if token has less than this remaining (e.g. 60s)
const REFRESH_BEFORE_MS = 60 * 1000;

const STORAGE_KEY = "appToken_record";

function isSessionAvailable(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

function setSessionToken(token: string, ttlMs = DEFAULT_TTL_MS) {
  if (!isSessionAvailable()) return;
  try {
    const record = { token, expiry: Date.now() + ttlMs };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.error("Failed to set session token", e);
  }
}

function getSessionTokenRecord(): { token: string; expiry: number } | null {
  if (!isSessionAvailable()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec.token !== "string" || typeof rec.expiry !== "number")
      throw new Error("invalid record");
    if (Date.now() > rec.expiry) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      return null;
    }
    return rec;
  } catch (e) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    return null;
  }
}

function removeSessionToken() {
  if (!isSessionAvailable()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to remove session token", e);
  }
}

export default function SignupPagePlain() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    company: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // App token state + loading derived from session record
  const [appToken, setAppToken] = useState<string | null>(() => {
    if (!isSessionAvailable()) return null;
    const rec = getSessionTokenRecord();
    return rec ? rec.token : null;
  });
  const [loadingApp, setLoadingApp] = useState<boolean>(() => {
    if (!isSessionAvailable()) return true; // assume loading in SSR/initial render
    return getSessionTokenRecord() ? false : true;
  });

  // in-memory lock/promise to avoid concurrent token fetches
  const fetchingRef = useRef<Promise<string | null> | null>(null);

  const benefits = [
    {
      title: "Fast Onboarding",
      description:
        "Get a project started in minutes with quote requests and messaging.",
      icon: "✓",
    },
    {
      title: "Secure by Default",
      description:
        "Role-based access and enterprise-grade isolation available.",
      icon: "🔒",
    },
    {
      title: "GitHub Integration",
      description: "Automate progress updates from commits & PRs.",
      icon: "⚙️",
    },
  ];

  function validate() {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Please enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8)
      e.password = "Password must be 8+ characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!form.agree) e.agree = "You must agree to the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // fetch token once with retries; supports server TTL shapes
  async function fetchAppTokenOnce(): Promise<{
    token: string;
    ttlMs?: number;
  } | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 250));
        }

        const res = await fetch(APP_TOKEN_URL, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Status ${res.status} ${txt}`);
        }

        const data = await res.json().catch(() => null);
        if (!data || !data.token) throw new Error("Invalid token response");

        let ttlMs: number | undefined = undefined;
        if (typeof data.expires_in === "number") ttlMs = data.expires_in * 1000;
        else if (typeof data.ttl_ms === "number") ttlMs = data.ttl_ms;
        else if (typeof data.expiresAt === "string") {
          const when = Date.parse(data.expiresAt);
          if (!Number.isNaN(when)) ttlMs = when - Date.now();
        }

        return { token: data.token, ttlMs };
      } catch (err) {
        console.error("App token fetch error (attempt)", attempt + 1, err);
        if (attempt === MAX_RETRIES - 1) {
          return null;
        }
      }
    }
    return null;
  }

  // ensure a valid token available (refresh if expired/about-to-expire).
  async function ensureValidAppToken(): Promise<string | null> {
    if (fetchingRef.current) return fetchingRef.current;

    const promise = (async () => {
      setLoadingApp(true);
      try {
        const rec = getSessionTokenRecord();
        if (rec) {
          const timeLeft = rec.expiry - Date.now();
          if (timeLeft > REFRESH_BEFORE_MS) {
            setAppToken(rec.token);
            return rec.token;
          }
        }

        toast.loading("Fetching app token...", { id: "app-token" });
        const result = await fetchAppTokenOnce();
        toast.dismiss("app-token");

        if (!result) {
          removeSessionToken();
          setAppToken(null);
          toast.error("Failed to fetch app token. Please try again later.");
          return null;
        }

        const ttl = result.ttlMs ?? DEFAULT_TTL_MS;
        setSessionToken(result.token, ttl);
        setAppToken(result.token);
        toast.success("Ready");
        return result.token;
      } finally {
        setLoadingApp(false);
        fetchingRef.current = null;
      }
    })();

    fetchingRef.current = promise;
    return promise;
  }

  // init on mount: use stored token if valid, otherwise fetch
  useEffect(() => {
    let mounted = true;
    async function init() {
      // only run browser APIs on client
      if (!isSessionAvailable()) {
        // attempt to fetch token on client even if SSR initial state was used
        if (typeof window !== "undefined") {
          await ensureValidAppToken();
        }
        return;
      }

      const rec = getSessionTokenRecord();
      if (rec) {
        if (!mounted) return;
        setAppToken(rec.token);
        setLoadingApp(false);
        return;
      }
      await ensureValidAppToken();
    }
    init();
    return () => {
      mounted = false;
      toast.dismiss("app-token");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    // ensure token (refresh if needed)
    const token = await ensureValidAppToken();
    if (!token) {
      toast.error("App is not ready. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating account…");
    try {
      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        agree: form.agree,
      };

      const res = await fetch(REGISTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-token": token,
        },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });

      type ApiResponse = {
        success?: boolean;
        token?: string;
        message?: string;
        error?: string;
      };

      let data: ApiResponse | null = null;
      try {
        data = (await res.json()) as ApiResponse;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.error ??
            data?.message ??
            `Registration failed (status ${res.status})`
        );
      }

      if (!data) {
        throw new Error("Invalid response from server");
      }

      // Success: server might return a session token for the new user.
      if (data.token || data.success) {
        // If server returned a token for authenticated user, you may want to store it (in cookie/local storage) here.
        toast.success("Account created — welcome ");
        router.push("/dashboard");
        // trigger navbar to update auth state
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-change"));
          // cross-tab: (writes to localStorage to trigger 'storage' across tabs)
          try {
            localStorage.setItem("auth:updated", Date.now().toString());
          } catch {}
        }
        return;
      }

      throw new Error(data.message ?? "Registration failed");
    } catch (err: unknown) {
      console.error("Register error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Could not create account. Try again later.";
      setServerError(message);
      toast.error(message);
    } finally {
      toast.dismiss(toastId);
      setLoading(false);
    }
  }

  const formDisabled = loadingApp || loading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <Toaster position="top-right" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="order-1 lg:order-2 flex items-center">
          <div
            className={`w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8 transition-opacity ${
              formDisabled ? "opacity-60 pointer-events-none" : "opacity-100"
            }`}
            aria-busy={formDisabled}
          >
            {loadingApp && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <svg
                    className="w-10 h-10 animate-spin text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <div className="text-sm text-gray-600">
                    Preparing secure connection…
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-black">
                Create an account
              </h3>
              <p className="text-sm text-black mt-1">
                Fill in the details to get started.
              </p>
            </div>

            {serverError && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded-md border border-red-100">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FloatingLabel
                  id="name"
                  label="Full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                  error={errors.name}
                />
                <FloatingLabel
                  id="company"
                  label="Company (optional)"
                  value={form.company}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, company: e.target.value }))
                  }
                />
              </div>

              <div className="mt-6">
                <FloatingLabel
                  id="email"
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                  error={errors.email}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                <div className="relative">
                  <FloatingLabel
                    id="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, password: e.target.value }))
                    }
                    error={errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2 top-3 inline-flex items-center justify-center h-8 w-8 rounded text-gray-500 hover:bg-gray-100"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.582-10-8 1-4.418 5-8 10-8 1.054 0 2.07.143 3.03.41M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div>
                  <FloatingLabel
                    id="confirm"
                    label="Confirm password"
                    type={showPassword ? "text" : "password"}
                    value={form.confirm}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, confirm: e.target.value }))
                    }
                    error={errors.confirm}
                  />
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3">
                <input
                  id="agree"
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, agree: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 mt-1"
                />
                <label htmlFor="agree" className="text-sm text-gray-700">
                  I agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
              {errors.agree && (
                <p className="mt-2 text-xs text-red-600">{errors.agree}</p>
              )}

              <button
                type="submit"
                disabled={formDisabled}
                className="w-full mt-6 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : null}
                <span>{loading ? "Creating…" : "Create account"}</span>
              </button>

              <p className="text-center text-sm text-black mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>

        <aside className="order-2 lg:order-1 flex flex-col justify-center">
          <div className="rounded-2xl p-6 md:p-10 bg-white shadow-sm border border-gray-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome</h2>
              <p className="text-sm text-gray-600 mt-1">
                A single platform for quotes, messaging, and automated progress
                reporting.
              </p>
            </div>

            <div className="space-y-4">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 font-bold">
                    {b.icon}
                  </span>
                  <div>
                    <p className="font-medium text-black">{b.title}</p>
                    <p className="text-sm text-black">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
