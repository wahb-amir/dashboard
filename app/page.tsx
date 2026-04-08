import React from "react";
import Link from "next/link";
import FeatureCard from "./components/FeatureCard";
import { checkAuth } from "./utils/checkAuth";

const Page = async () => {
  const auth = await checkAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-stone-900 selection:bg-teal-900 selection:text-teal-50">
      <main className="flex-1">
        {/* ── Hero (Asymmetrical Two-Column) ───────────────────── */}
        <section className="border-b border-stone-200 px-6 py-20 md:py-28 lg:py-32">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 lg:grid-cols-[1fr_400px] lg:gap-24 items-center">
            {/* Left — Editorial Copy */}
            <div className="max-w-2xl">
              <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-500">
                Client portal · Wahb Amir
              </p>
              <h1 className="mb-8 font-serif text-[clamp(40px,7vw,72px)] font-normal leading-[0.95] tracking-[-0.03em] text-stone-950">
                One place to build your <br className="hidden sm:block" />
                <em className="font-serif italic text-teal-800">
                  project with me.
                </em>
              </h1>
              <p className="mb-10 max-w-[480px] text-[15px] font-light leading-relaxed text-stone-600">
                Request a quote, follow along as your project gets built, and
                message me directly. No email chains, no status-check calls—just
                pure momentum.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={auth ? "/dashboard" : "/register"}
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-stone-900 px-7 py-3 text-[13.5px] font-medium text-stone-50 transition duration-300 hover:bg-teal-900 hover:shadow-[0_0_20px_rgba(13,148,136,0.3)]"
                >
                  <span className="relative z-10">
                    {auth ? "Go to dashboard" : "Request a quote"}
                  </span>
                </Link>
                <Link
                  href="/about"
                  className="rounded-full border border-stone-300 px-7 py-3 text-[13.5px] font-normal text-stone-600 transition hover:border-stone-400 hover:text-stone-900"
                >
                  See how it works →
                </Link>
              </div>

              {!auth && (
                <p className="mt-6 font-mono text-[11px] text-stone-500">
                  Already working with me?{" "}
                  <Link
                    href="/login"
                    className="text-stone-800 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-600"
                  >
                    Sign in here.
                  </Link>
                </p>
              )}
            </div>

            {/* Right — Tangible Feed Preview */}
            <div className="relative w-full rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="absolute -left-4 -top-4 -z-10 h-full w-full rounded-xl bg-stone-100" />
              <div className="mb-6 flex items-center justify-between border-b border-stone-100 pb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-stone-400">
                  Live Sync
                </p>
                <span className="flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                </span>
              </div>
              <ul className="flex flex-col gap-5">
                {[
                  {
                    time: "Just now",
                    text: "Quote accepted — workspace initialized",
                    active: true,
                  },
                  {
                    time: "2h ago",
                    text: "4 commits pushed · core auth module",
                    active: false,
                  },
                  {
                    time: "Yesterday",
                    text: "Milestone reached: Database schema",
                    active: false,
                  },
                  {
                    time: "Yesterday",
                    text: "Message from Wahb",
                    active: false,
                  },
                ].map(({ time, text, active }) => (
                  <li key={text} className="flex items-start gap-4">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${active ? "bg-teal-600" : "bg-stone-300"}`}
                    />
                    <div>
                      <p
                        className={`text-[13px] ${active ? "text-stone-900 font-medium" : "text-stone-600 font-light"}`}
                      >
                        {text}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-stone-400">
                        {time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-stone-50">
                <p className="text-[12px] font-light leading-relaxed text-stone-500 italic">
                  GitHub connects directly. Every commit maps to your timeline
                  automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Honest Numbers Strip ─────────────────────────────── */}
        <section className="border-b border-stone-200 bg-[#FAFAFA]">
          <div className="mx-auto max-w-6xl grid grid-cols-1 divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { val: "<24h", label: "Quote turnaround" },
              { val: "Weeks", label: "Typical MVP timeline" },
              { val: "1 dev", label: "Direct accountability" },
            ].map(({ val, label }) => (
              <div key={label} className="px-6 py-10 text-center">
                <p className="font-serif text-[32px] font-normal tracking-tight text-stone-900">
                  {val}
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-stone-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The Process (Refined List) ───────────────────────── */}
        <section className="mx-auto max-w-6xl border-b border-stone-200 px-6 py-24">
          <p className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400 text-center">
            How it works
          </p>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {[
              {
                n: "01",
                title: "Submit a brief",
                body: "Define your scope, budget, and timeline in 3 minutes. No endless discovery calls required.",
              },
              {
                n: "02",
                title: "Get a quote",
                body: "I review your brief and return a structured proposal with exact milestones and pricing within 24 hours.",
              },
              {
                n: "03",
                title: "Watch it compile",
                body: "Accept the quote and watch your dashboard update automatically as I push code to the repository.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex flex-col group">
                <span className="mb-4 font-mono text-[14px] text-stone-300 transition-colors group-hover:text-teal-700">
                  {n}
                </span>
                <h3 className="mb-3 font-serif text-[22px] text-stone-900">
                  {title}
                </h3>
                <p className="text-[14px] font-light leading-relaxed text-stone-600">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Grid ─────────────────────────────────────── */}
        <FeatureCard />

        {/* ── Dark Mode Footer CTA ─────────────────────────────── */}
        <section className="relative overflow-hidden bg-stone-950 px-6 py-32 text-center text-stone-50">
          {/* Dot grid background */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, #57534e 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
              opacity: 0.4,
            }}
          />

          {/* Vignette overlay — fades grid at edges */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, #0c0a09 100%)",
            }}
          />

          {/* Teal radial glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-900/20 blur-[100px]" />

          {/* Corner accents */}
          <div className="pointer-events-none absolute left-0 top-0 h-32 w-32 border-l border-t border-stone-700/40" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-32 border-b border-r border-stone-700/40" />

          <div className="mx-auto max-w-2xl relative z-10">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">
              Ready to start?
            </p>
            <h2 className="mb-6 font-serif text-[clamp(36px,5vw,56px)] font-normal leading-[1.05] tracking-[-0.02em]">
              Let&rsquo;s build{" "}
              <em className="italic text-teal-400">something real.</em>
            </h2>
            <p className="mx-auto mb-10 max-w-md text-[15px] font-light leading-relaxed text-stone-400">
              Tell me what you&rsquo;re working on. I&rsquo;ll read it, map out
              the architecture, and send you a proper quote within 24 hours.
            </p>
            <Link
              href={auth ? "/dashboard" : "/register"}
              className="inline-block rounded-full bg-stone-50 px-8 py-3.5 text-[14px] font-medium text-stone-950 transition-transform duration-300 hover:scale-105 hover:bg-white"
            >
              {auth ? "Go to dashboard" : "Request a quote →"}
            </Link>
            <p className="mt-8 font-mono text-[11px] text-stone-500 opacity-80">
              No account managers, no hand-offs.
              <br />
              Just you, me, and the codebase.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Page;
