"use client";

import { useState } from "react";
import Sidebar from "@/app/components/ui/Sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sidebar open={mobileOpen} setOpen={setMobileOpen} />

      <main className="relative z-0 pt-16 md:ml-64 p-4">{children}</main>
    </>
  );
}
