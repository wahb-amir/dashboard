"use client";

import Link from "next/link";
import Logo from "./ui/Logo";
import type { AuthTokenPayload } from "../utils/token";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./ui/Sidebar";
import { Bell, Menu, X } from "lucide-react";
import React, { useEffect, useState } from "react";

type NavbarProps = {
  userAuth: AuthTokenPayload | false;
  messageCount?: number; // optional - default 0
};

export default function Navbar({ userAuth, messageCount = 0 }: NavbarProps) {
  const pathname = usePathname() ?? "/";
  const isAuthed = Boolean(userAuth);
  const router = useRouter();

  const showSidebar = pathname.startsWith("/dashboard");

  // Controlled sidebar state (Navbar owns the open state)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const profileLetter = (() => {
    if (!userAuth) return "U";
    const source = userAuth.name || userAuth.email;
    if (!source || typeof source !== "string") return "U";
    return source.charAt(0).toUpperCase();
  })();

  return (
    <>
      {/* Desktop sidebar (unchanged) */}
      {showSidebar && (
        <div className="hidden md:block">
          <Sidebar
            open={false}
            setOpen={() => {}} /* desktop uses its own fixed layout */
          />
        </div>
      )}

      <header className="sticky top-0 z-50 w-full bg-white backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14 md:h-16">
            <div className="mr-3 md:mr-4 flex items-center">
              <Link href="/" className="flex items-center" aria-label="Home">
                <Logo className="w-8 h-8 md:w-10 md:h-10" />
              </Link>
            </div>

            <div className="flex-1" />

            {/* Mobile actions (hamburger moved here) */}
            <nav
              className="flex items-center space-x-2 md:hidden"
              aria-label="Primary"
            >
              {/* Hamburger (mobile) - only show when dashboard routes should display sidebar */}
              {showSidebar && (
                <button
                  aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                  onClick={() => setSidebarOpen((s) => !s)}
                  className="p-2 rounded-md hover:bg-gray-100 transition"
                >
                  {!sidebarOpen ? (
                    <Menu size={20} className="text-black" />
                  ) : (
                    <X size={20} className="text-black" />
                  )}
                </button>
              )}

              {!showSidebar && (
                <Link
                  href="/about"
                  className="text-base inline-flex items-center px-3 py-1 rounded-md bg-transparent text-black hover:bg-gray-100 transition"
                >
                  About
                </Link>
              )}

              {isAuthed ? (
                // make Dashboard text smaller to fit on mobile
                <Link
                  href="/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="text-xs inline-flex items-center px-2 py-1 rounded-md font-semibold bg-blue-600 text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-3 py-1 text-sm rounded-md font-medium border border-transparent text-black hover:text-gray-900 transition"
                  >
                    Log In
                  </Link>

                  <Link
                    href="/register"
                    className="inline-flex items-center px-3 py-1 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>

            {/* DESKTOP NAV */}
            <nav
              className="hidden md:flex items-center space-x-3"
              aria-label="Primary"
            >
              {!showSidebar && (
                <Link
                  href="/about"
                  className="text-lg inline-flex items-center px-3 py-1 rounded-md bg-transparent text-black hover:bg-gray-100 transition"
                >
                  About
                </Link>
              )}

              {!isAuthed ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded-md font-medium border border-transparent text-black hover:text-gray-900 transition"
                  >
                    Log In
                  </Link>

                  <Link
                    href="/register"
                    className="inline-flex items-center px-4 py-2 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
                  >
                    Get Started
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/messages")}
                    aria-label="Unread messages"
                    className="relative inline-flex items-center p-1 rounded-md hover:bg-gray-100 transition"
                  >
                    <Bell size={18} className="text-black" />
                    {messageCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                        {messageCount > 99 ? "99+" : messageCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => router.push("/profile")}
                    aria-label="Your profile"
                    className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-black font-medium hover:bg-gray-200 transition"
                  >
                    {profileLetter}
                  </button>

                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
                  >
                    Dashboard
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Controlled Sidebar (mobile drawer). We pass open/setOpen so Navbar controls it.
          For desktop the Sidebar component still renders its fixed layout (we keep that above). */}
      {showSidebar && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
    </>
  );
}
