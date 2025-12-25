"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FloatingLabel from "../components/ui/FloatingLabel";
type FormState = {
  name: string;
  company: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
};

const benefits = [
  {
    title: "Fast Onboarding",
    description:
      "Get a project started in minutes with quote requests and messaging.",
    icon: "✓",
  },
  {
    title: "Secure by Default",
    description: "Role-based access and enterprise-grade isolation available.",
    icon: "🔒",
  },
  {
    title: "GitHub Integration",
    description: "Automate progress updates from commits & PRs.",
    icon: "⚙️",
  },
];

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setServerError("Could not create account. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      {/* Top-level grid: stacked on small screens, two columns on lg */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: brand / benefits */}
        <aside className="flex flex-col justify-center order-1">
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

        {/* RIGHT: form */}
        <div className="order-2 flex items-center">
          <div className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8">
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
                <div>
                  <FloatingLabel
                    id="name"
                    label="Full name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, name: e.target.value }))
                    }
                    error={errors.name}
                  />
                </div>
                <div>
                  <FloatingLabel
                    id="company"
                    label="Company (optional)"
                    value={form.company}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, company: e.target.value }))
                    }
                  />
                </div>
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
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3.582-10-8 1-4.418 5-8 10-8 1.054 0 2.07.143 3.03.41"
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
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
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
                disabled={loading}
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
      </div>
    </div>
  );
}
