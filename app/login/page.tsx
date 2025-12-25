"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FloatingLabel from "../components/ui/FloatingLabel";
type FormState = {
  email: string;
  password: string;
  remember: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const e: { email?: string; password?: string } = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Please enter a valid email";

    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      // Replace with real auth request
      await new Promise((res) => setTimeout(res, 700));
      router.push("/dashboard");
    } catch (err) {
      setServerError("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 antialiased">
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* left: brand / benefits */}
            <aside className="order-2 md:order-1">
              <div className="rounded-2xl p-6 md:p-10 bg-white shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Welcome
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      A single platform for quotes, messaging, and automated
                      progress reporting.
                    </p>
                  </div>
                </div>

                <ul className="space-y-4 text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 font-semibold">
                      ✓
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        Single source of truth
                      </p>
                      <p className="text-sm text-gray-600 max-w-xl">
                        Keep clients and developers aligned from quote to
                        delivery.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-purple-50 text-purple-600 font-semibold">
                      💬
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        Live messaging
                      </p>
                      <p className="text-sm text-gray-600">
                        Real-time conversation without email clutter.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-yellow-50 text-yellow-600 font-semibold">
                      ⤴
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        GitHub integration
                      </p>
                      <p className="text-sm text-gray-600">
                        Automated progress from commits & PRs.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </aside>

            {/* right: form */}
            <section className="order-1 md:order-2">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8">
                <div className="mb-6">
                  <h1 className="text-lg md:text-2xl font-semibold text-gray-900">
                    Sign in to your account
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Enter your email and password to continue.
                  </p>
                </div>

                {serverError && (
                  <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded-md border border-red-100">
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  {/* Grouped inputs with responsive vertical spacing */}
                  <div className="space-y-4 md:space-y-6">
                    {/* Email (floating) */}
                    <FloatingLabel
                      id="email"
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, email: e.target.value }))
                      }
                      error={errors.email}
                      autoComplete="email"
                    />

                    {/* Password (floating) with trailing eye button */}
                    <FloatingLabel
                      id="password"
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, password: e.target.value }))
                      }
                      error={errors.password}
                      autoComplete="current-password"
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-gray-100"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
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
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between mb-6 mt-6">
                    <label className="inline-flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.remember}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, remember: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                      />
                      <span className="ml-2">Remember me</span>
                    </label>

                    <Link
                      href="/forgot"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    {loading ? (
                      <svg
                        className="w-5 h-5 animate-spin"
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
                    <span>{loading ? "Signing in…" : "Sign in"}</span>
                  </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                  New here?{" "}
                  <Link
                    href="/signup"
                    className="text-blue-600 hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
