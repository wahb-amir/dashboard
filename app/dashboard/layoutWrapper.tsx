"use client";

import { useState } from "react";
import Sidebar from "@/app/components/ui/Sidebar";
import Navbar from "@/app/components/Navbar/Navbar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Pass the state to Navbar */}
      <Navbar
        isMobileMenuOpen={mobileOpen}
        setIsMobileMenuOpen={setMobileOpen}
      />

      {/* Pass the same state to Sidebar */}
      <Sidebar open={mobileOpen} setOpen={setMobileOpen} />

      <main className="relative z-0 pt-16 md:ml-64 p-4">{children}</main>
    </>
  );
}
