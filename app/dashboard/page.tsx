// app/dashboard/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { checkAuth } from "@/app/utils/checkAuth";
import DashboardPageClient from "@/app/components/dashboard/DashboardPageClient";
import type { AuthTokenPayload } from "@/app/utils/token";

export default async function Page() {
  const auth = await checkAuth();

  // completely unauthenticated → redirect to login
  if (auth === false) {
    redirect("/login?reason=auth");
  }

  // auth is now { payload: AuthTokenPayload | null, needsRefresh: boolean }
  const user: AuthTokenPayload | null = auth.payload;
  const needsRefresh: boolean = auth.needsRefresh;

  // Render client component — server handles SEO + redirect.
  return (
    <>
      
      <DashboardPageClient user={user} needsRefresh={needsRefresh} />{" "}
    </>
  );
}
