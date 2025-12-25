"use client";

import Link from "next/link";
import Logo from "./ui/Logo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-14 md:h-16">
          {/* Logo (smaller on mobile) */}
          <div className="mr-3 md:mr-4 flex items-center">
            <Link href="/" className="flex items-center">
              <Logo className="w-8 h-8 md:w-10 md:h-10" />
            </Link>
          </div>

          {/* filler */}
          <div className="flex-1" />

          {/* MOBILE: show compact inline actions (no hamburger) */}
          <nav className="flex items-center space-x-2 md:hidden">
            <Link
              href="/about"
              className="text-xs font-medium text-gray-800/90 hover:text-gray-900 transition px-2 py-1"
            >
              About
            </Link>

            <Link
              href="/login"
              className="text-xs inline-flex items-center px-3 py-1 rounded-md font-medium text-gray-800/90 border border-transparent hover:bg-gray-100 transition"
            >
              Log In
            </Link>

            <Link
              href="/dashboard"
              className="text-xs inline-flex items-center px-3 py-1 rounded-md font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Get Started
            </Link>
          </nav>

          <nav className="hidden md:flex items-center space-x-3">
            <Link
              href="/about"
              className="text-sm font-medium text-gray-800/90 hover:text-gray-900 transition"
            >
              About
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-md font-medium border border-transparent text-gray-800/90 hover:text-gray-900 transition"
            >
              Log In
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
