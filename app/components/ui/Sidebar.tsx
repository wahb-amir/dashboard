"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Home, Grid, MessageSquare, FileText, Users, X } from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/dashboard", Icon: Home },
  { name: "Projects", href: "/dashboard/projects", Icon: Grid },
  { name: "Messages", href: "/dashboard/messages", Icon: MessageSquare },
  { name: "Quotes", href: "/dashboard/quotes", Icon: FileText },
  { name: "Team", href: "/dashboard/team", Icon: Users },
];

type SidebarProps = {
  // If omitted, component will manage its own open state (uncontrolled)
  open?: boolean;
  setOpen?: (v: boolean) => void;
};

export default function Sidebar({
  open: openProp,
  setOpen: setOpenProp,
}: SidebarProps) {
  // support controlled (props) or uncontrolled (internal state)
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled =
    typeof openProp === "boolean" && typeof setOpenProp === "function";
  const open = isControlled ? openProp! : internalOpen;
  const setOpen = isControlled ? setOpenProp! : setInternalOpen;

  const pathname = usePathname() ?? "/";

  // lock body scroll when menu open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // close on Escape
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    },
    [setOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-20 bg-white border-r">
        <div className="h-16 flex items-center px-4">
          <Link href="/" className="text-lg font-bold text-black">
            Projects
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Primary">
          <ul className="space-y-1">
            {NAV_ITEMS.map((it) => {
              let active = false;
              if (it.href === "/dashboard") {
                active = pathname === "/dashboard" || pathname === "/";
              } else {
                active =
                  pathname === it.href || pathname.startsWith(it.href + "/");
              }

              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)} // safe in both modes
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition ${
                      active
                        ? "bg-blue-200 font-semibold text-black"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <it.Icon className="text-black" size={18} />
                    <span className="text-sm">{it.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <Link
            href="/settings"
            className="text-sm text-black hover:text-black"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {/* Render backdrop even when closed so tailwind transitions don't get purged; classes include both states */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-200 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* clickable backdrop (below the drawer) */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpen(false)}
          onTouchStart={() => setOpen(false)}
        />
      </div>

      {/* Mobile drawer */}
      <div
        // drawer sits above backdrop (z-50)
        className={`fixed z-50 top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white border-r md:hidden transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        // prevent clicks inside drawer from bubbling to backdrop
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="h-16 flex items-center px-4 border-b">
          <Link
            href="/"
            className="text-lg font-bold text-black"
            onClick={() => setOpen(false)}
          >
            Projects
          </Link>

          <button
            aria-label="Close menu"
            className="ml-auto p-2 rounded-md hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            <X size={18} className="text-black" />
          </button>
        </div>

        <nav
          className="px-2 py-4 overflow-y-auto"
          aria-label="Mobile navigation"
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition ${
                      active
                        ? "bg-blue-50 font-semibold text-black"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <it.Icon className="text-black" size={18} />
                    <span className="text-sm">{it.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <Link
            href="/settings"
            className="text-sm text-black hover:text-black"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
        </div>
      </div>
    </>
  );
}
