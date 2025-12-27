"use client";

import React from "react";

/* ----------------------------- Mock Data ----------------------------- */

type Project = {
  id: string;
  name: string;
  client: string;
  status: "In Progress" | "Completed" | "On Hold" | "Draft";
  dueDate?: string; // ISO
  progress: number; // 0-100
  description?: string;
  tags?: string[];
};

const mockProjects: Project[] = [
  {
    id: "p-1",
    name: "Website Redesign",
    client: "Acme Co",
    status: "In Progress",
    dueDate: "2026-02-10",
    progress: 65,
    description: "Full redesign of marketing website with new CMS integration.",
    tags: ["design", "frontend"],
  },
  {
    id: "p-2",
    name: "Mobile App (iOS/Android)",
    client: "Bright Labs",
    status: "In Progress",
    dueDate: "2026-04-02",
    progress: 40,
    description: "Cross-platform mobile app for order management.",
    tags: ["mobile", "api"],
  },
  {
    id: "p-3",
    name: "Analytics Dashboard",
    client: "DataHouse",
    status: "Completed",
    dueDate: "2025-11-12",
    progress: 100,
    description: "Internal dashboard for KPIs and event tracking.",
    tags: ["backend", "dashboard"],
  },
  {
    id: "p-4",
    name: "Landing Page Sprint",
    client: "SoloFounder",
    status: "Draft",
    progress: 5,
    description: "A/B test landing pages for paid ads.",
    tags: ["frontend"],
  },
  {
    id: "p-5",
    name: "E-commerce Migration",
    client: "ShopPro",
    status: "On Hold",
    dueDate: "2026-01-18",
    progress: 22,
    description: "Move shop to new headless stack.",
    tags: ["ecommerce", "infra"],
  },
  {
    id: "p-6",
    name: "Email Automation",
    client: "Inboxly",
    status: "In Progress",
    dueDate: "2026-03-05",
    progress: 78,
    description: "Automated flows and transactional templates.",
    tags: ["email", "automation"],
  },
];

type Activity = {
  id: string;
  when: string;
  text: string;
  meta?: string;
};

const mockActivities: Activity[] = [
  {
    id: "a1",
    when: "2m ago",
    text: "New comment on Website Redesign",
    meta: "by Sarah",
  },
  {
    id: "a2",
    when: "1h ago",
    text: "Deployment succeeded",
    meta: "Mobile App",
  },
  { id: "a3", when: "Yesterday", text: "Invoice paid", meta: "DataHouse" },
  { id: "a4", when: "2d ago", text: "New member invited", meta: "Team" },
];

/* ----------------------------- UI Primitives ----------------------------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 border-b ${className}`}>{children}</div>;
}

function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

function CardDescription({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`text-sm text-gray-600 ${className}`}>{children}</p>;
}

function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

/* ----------------------------- Small Components ----------------------------- */

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-gray-500">{hint}</div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all"
        style={{
          width: `${clamped}%`,
          background:
            clamped === 100
              ? "linear-gradient(90deg,#06b6d4,#3b82f6)"
              : undefined,
          backgroundColor: clamped !== 100 ? "#2563eb" : undefined,
        }}
      />
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {project.name}
          </div>
          <div className="text-xs text-gray-600">{project.client}</div>
        </div>
        <div
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            background: project.status === "Completed" ? "#d1fae5" : "#eef2ff",
          }}
        >
          {project.status}
        </div>
      </div>

      <div className="mt-2 text-sm text-gray-700">{project.description}</div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex-1">
          <ProgressBar value={project.progress} />
        </div>
        <div className="text-xs text-gray-600 w-16 text-right">
          {project.progress}%
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(project.tags || []).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 bg-white border rounded-full text-gray-700"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Create projects, invite team members, or export data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:brightness-95">
            New Project
          </button>
          <button className="flex-1 px-4 py-2 rounded-md border border-gray-200">
            Invite
          </button>
          <button className="flex-1 px-4 py-2 rounded-md border border-gray-200">
            Export CSV
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Tip: use templates to speed up project setup.
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeedCard({ className = "" }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>
          Recent activity from your team and projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {mockActivities.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <div className="flex-none w-10 h-10 rounded-full bg-gray-100 grid place-items-center text-xs font-semibold text-gray-700">
                {a.when}
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-900">{a.text}</div>
                <div className="text-xs text-gray-500">{a.meta}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- Page ----------------------------- */

export default function DashboardPage() {
  const inProgressCount = mockProjects.filter(
    (p) => p.status === "In Progress"
  ).length;
  const completedCount = mockProjects.filter(
    (p) => p.status === "Completed"
  ).length;
  const openCount = mockProjects.filter((p) => p.status !== "Completed").length;

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={inProgressCount}
          hint={`${openCount} total open projects`}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          hint="Projects finished this year"
        />
        <QuickActionsCard />
        <Card className="col-span-full md:col-span-2 lg:col-span-1 xl:col-span-2">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>New features are on the way.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-gray-500 pt-4">
              More insights will be available here.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
            <CardDescription>
              An overview of your current projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {mockProjects
              .filter((p) => p.status !== "Completed")
              .map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
          </CardContent>
        </Card>

        <ActivityFeedCard className="col-span-full lg:col-span-3" />
      </div>
    </div>
  );
}
