import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden bg-stone-900 text-stone-400 border-t border-stone-800">

      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, #78716c 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          opacity: 0.15,
        }}
      />

      {/* Subtle top teal accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-700/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 py-16">

        <div className="grid grid-cols-1 gap-12 border-b border-stone-800 pb-16 sm:grid-cols-3 sm:gap-8">

          {/* Brand */}
          <div className="flex flex-col gap-4">
            <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-stone-200">
              wahb.space/portal
            </p>
            <p className="max-w-[240px] text-[13.5px] font-light leading-relaxed text-stone-500">
              A private client workspace architected and maintained by Wahb Amir.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/30 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-500">
                System Operational
              </span>
            </div>
          </div>

          {/* Platform */}
          <div className="flex flex-col gap-5">
            <p className="font-serif text-[18px] italic text-stone-300">Platform</p>
            <nav className="flex flex-col gap-3">
              {[
                { label: "Request a quote", href: "/register" },
                { label: "Log in to dashboard", href: "/login" },
                { label: "About", href: "/about" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-1.5 text-[13.5px] font-light text-stone-500 transition-colors hover:text-teal-400"
                >
                  <span className="inline-block h-px w-3 bg-stone-700 transition-all group-hover:w-5 group-hover:bg-teal-700" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Engineering */}
          <div className="flex flex-col gap-5">
            <p className="font-serif text-[18px] italic text-stone-300">Engineering</p>
            <nav className="flex flex-col gap-3">
              {[
                { label: "wahb.space", href: "https://wahb.space" },
                { label: "GitHub (wahb-amir)", href: "https://github.com/wahb-amir" },
                { label: "LinkedIn", href: "https://www.linkedin.com/in/wahb-amir" },
              ].map(({ label, href }) => (
                  <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 text-[13.5px] font-light text-stone-500 transition-colors hover:text-teal-400"
                >
                  <span className="inline-block h-px w-3 bg-stone-700 transition-all group-hover:w-5 group-hover:bg-teal-700" />
                  {label}
                  <span className="text-[10px] opacity-40 group-hover:opacity-70">↗</span>
                </a>
              ))}
            </nav>
          </div>

        </div> 

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 sm:flex-row">
          <p className="font-mono text-[11px] tracking-[0.05em] text-stone-600">
            © {new Date().getFullYear()} Wahb Amir
          </p>
          <p className="font-mono text-[11px] tracking-[0.05em] text-stone-600">
            Built with{" "}
            <span className="text-teal-700">TypeScript</span>
            {" & "}
            <span className="text-teal-700">SQL</span>
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;