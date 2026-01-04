// app/components/dashboard/DashboardServer.tsx
import { cookies } from "next/headers"; // Essential for server-side fetch auth
import DashboardPageClient from "./DashboardPageClient";
import type { AuthTokenPayload } from "@/app/utils/token";
import type { ProjectFromDB } from "@/app/components/Projects/ProjectCard";

interface Props {
  user: AuthTokenPayload | null;
  needsRefresh: boolean;
}

const PAGE_SIZE = 6;

export default async function DashboardServer({ user, needsRefresh }: Props) {
  let initialProjects: ProjectFromDB[] = [];
  let initialHasMore = true;
  let redirectTo: string | undefined = undefined; // Initialize variable

  try {
    const cookieStore = await cookies();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/project?limit=${PAGE_SIZE}&offset=0`,
      {
        cache: "no-store",
        headers: {
          // Forward cookies so the API can check for revocation
          Cookie: cookieStore.toString(),
        },
      }
    );

    const data = await res.json();

    if (res.ok) {
      initialProjects = Array.isArray(data) ? data : data.projects ?? [];
      initialHasMore =
        !Array.isArray(data) && typeof data.total === "number"
          ? data.total > PAGE_SIZE
          : initialProjects.length === PAGE_SIZE;
    } else {
      // Capture the redirect instruction from the API error response
      if (data.redirectTo) {
        redirectTo = data.redirectTo;
      }
    }
  } catch (error) {
    console.error("Fetch error in DashboardServer:", error);
  }

  return (
    <DashboardPageClient
      initialUser={user}
      needsRefresh={needsRefresh}
      initialProjects={initialProjects}
      initialPage={0}
      initialHasMore={initialHasMore}
      initialQuery=""
      redirectTo={redirectTo} 
    />
  );
}
