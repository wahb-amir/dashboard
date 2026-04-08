"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useToast } from "../components/toast/ToastProvider";
const RegisterPage = () => {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nameRef    = useRef<HTMLInputElement>(null);
  const emailRef   = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const submitRef  = useRef<HTMLButtonElement>(null);

  const advanceTo = (ref: React.RefObject<HTMLInputElement | HTMLButtonElement | null>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ref.current?.focus();
      }
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name     = (form.elements.namedItem("name")     as HTMLInputElement).value.trim();
    const email    = (form.elements.namedItem("email")    as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const terms    = (form.elements.namedItem("terms")    as HTMLInputElement).checked;

    if (!name || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!terms) {
      toast.error("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Something went wrong.");
      } else {
        toast.success("Workspace initialized. Redirecting…");
        setTimeout(() => { window.location.href = "/dashboard"; }, 1200);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { tag: "[ 01 ]", title: "Instant Proposals",  desc: "Get structured quotes within 24 hours of submission."    },
    { tag: "[ 02 ]", title: "Live Build Feed",     desc: "Watch commits and milestones update in real-time."       },
    { tag: "[ 03 ]", title: "Contextual Comms",    desc: "Direct messaging tied to specific project phases."       },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-stone-900">

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-12 lg:flex-row lg:items-center lg:gap-20">

        {/* Left: Manifesto */}
        <div className="hidden flex-1 lg:block">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">
            The Partnership
          </p>
          <h2 className="mb-12 font-serif text-[48px] leading-[1.1] tracking-tight">
            Built for those who <br />
            <em className="italic text-teal-800">value momentum.</em>
          </h2>
          <div className="space-y-10">
            {benefits.map((b) => (
              <div key={b.tag} className="max-w-sm">
                <p className="mb-2 font-mono text-[10px] text-teal-700">{b.tag}</p>
                <h3 className="mb-2 font-serif text-[20px] text-stone-900">{b.title}</h3>
                <p className="text-[14px] font-light leading-relaxed text-stone-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full lg:max-w-[460px]"
        >
          <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-sm lg:p-10">
            <div className="mb-8">
              <h1 className="font-serif text-[32px] text-stone-950">Create account</h1>
              <p className="mt-2 text-[14px] font-light text-stone-500">
                Start your first project workspace today.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
                  Your Name
                </label>
                <input
                  id="name"
                  name="name"
                  ref={nameRef}
                  type="text"
                  autoComplete="given-name"
                  autoFocus
                  onKeyDown={advanceTo(emailRef)}
                  placeholder="First name is fine"
                  className="w-full border-b border-stone-200 bg-transparent py-2 text-[14px] font-light outline-none transition-colors focus:border-teal-600 placeholder:text-stone-300"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  onKeyDown={advanceTo(passwordRef)}
                  placeholder="you@example.com"
                  className="w-full border-b border-stone-200 bg-transparent py-2 text-[14px] font-light outline-none transition-colors focus:border-teal-600 placeholder:text-stone-300"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitRef.current?.focus();
                      }
                    }}
                    placeholder="Min. 8 characters"
                    className="w-full border-b border-stone-200 bg-transparent py-2 pr-16 text-[14px] font-light outline-none transition-colors focus:border-teal-600 placeholder:text-stone-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-400 transition-colors hover:text-stone-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                />
                <label htmlFor="terms" className="text-[12px] font-light leading-relaxed text-stone-500">
                  I agree to the{" "}
                  <Link href="/terms" className="text-stone-900 underline decoration-stone-200 underline-offset-2 transition-colors hover:decoration-teal-600">
                    Terms of Service
                  </Link>{" "}
                  and understand this is a direct engineering partnership.
                </label>
              </div>

              {/* Submit */}
              <button
                ref={submitRef}
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-stone-900 py-3.5 text-[14px] font-medium text-stone-50 transition-all hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-50/30 border-t-stone-50" />
                    Initializing…
                  </span>
                ) : (
                  "Initialize Workspace →"
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-stone-100 pt-6 text-center">
              <p className="text-[13px] font-light text-stone-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-stone-900 underline decoration-stone-200 underline-offset-4 transition-colors hover:decoration-teal-600"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default RegisterPage;