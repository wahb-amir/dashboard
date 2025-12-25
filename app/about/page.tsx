"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  GitCommit,
  MessageSquare,
  Briefcase,
  BarChart,
} from "lucide-react";
import Logo from "@/app/components/ui/Logo";
import { FaGithub } from "react-icons/fa";
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

/* ------------------------- Small local UI primitives ------------------------ */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost";
  asLink?: boolean;
  href?: string;
}

function Button({
  variant = "solid",
  children,
  className = "",
  asLink,
  href,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants: Record<string, string> = {
    solid: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    ghost:
      "bg-transparent text-gray-800 hover:bg-gray-100 focus:ring-gray-300 border border-transparent",
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  if (asLink && href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: string;
  children: React.ReactNode;
}

function Card({ children, className = "", ...rest }: CardProps) {
  // lightweight card: no expensive blur, good reshape for performance
  return (
    <div
      className={`bg-white/95 border border-gray-100 rounded-xl shadow-sm p-6 transition-transform duration-200 transform-gpu hover:-translate-y-1 hover:shadow-lg ${className}`}
      style={{ willChange: "transform, opacity", contain: "paint" }}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-4 mb-3">{children}</div>;
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-900">{children}</h3>;
}
function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="text-gray-700 text-sm">{children}</div>;
}

/* ------------------------------- Data + Page ------------------------------- */

const features: {
  icon: IconComponent;
  title: string;
  description: string;
  colorClass?: string;
}[] = [
  {
    icon: Briefcase,
    title: "Quote Requests",
    description:
      "Clients can request quotes for new projects, providing necessary details upfront so work starts with clear scope.",
    colorClass: "text-blue-600 bg-blue-50",
  },
  {
    icon: MessageSquare,
    title: "Live Messaging",
    description:
      "Real-time chat between clients and developers keeps communication direct and reduces email noise.",
    colorClass: "text-purple-600 bg-purple-50",
  },
  {
    icon: BarChart,
    title: "Progress Tracking",
    description:
      "Visualize project progress with automated updates from development activity and commits.",
    colorClass: "text-yellow-600 bg-yellow-50",
  },
  {
    icon: GitCommit,
    title: "GitHub Integration",
    description:
      "Sync repos, commits, and pull requests to automate progress reporting and reduce manual status updates.",
    colorClass: "text-gray-800 bg-gray-100",
  },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold">
              Client & Developer Collaboration Platform
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-gray-600 md:text-lg">
              A single-platform collaboration tool that replaced fragmented
              email/chat processes and automated progress reporting — improving
              transparency and reducing manual status updates.
            </p>

            <div className="flex justify-center gap-4 mt-8">
              <Link
                href="https://github.com/wahb-amir/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
              >
                <span className="w-5 h-5">
                  <FaGithub />
                </span>
                View Repo
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-blue-50 text-blue-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Role</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Full-Stack Engineer — owned end-to-end design and
                    implementation of client & developer workflows, GitHub
                    integration, and CI/CD automation.
                  </p>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-gray-100 text-gray-800">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Constraints</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    MVP in 8 weeks, role-based access, secure logins,
                    enterprise-grade data isolation, limited budget for external
                    integrations.
                  </p>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Problem & Approach */}
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 space-y-6">
            <Card className="p-6">
              <CardHeader>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-red-50 text-red-600">
                  <BarChart className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Problem</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Clients and developers relied on email, chat and
                    spreadsheets to track work. This caused missed updates,
                    unclear ownership, and frequent status-check requests.
                  </p>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-amber-50 text-amber-600">
                  <GitCommit className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Approach</CardTitle>
                  <ul className="mt-2 ml-5 list-disc text-sm text-gray-700 space-y-1">
                    <li>
                      Interviewed 5 users (clients & developers) to understand
                      real pain points and workflow bottlenecks.
                    </li>
                    <li>
                      Mapped user journeys for three key personas: client,
                      manager, developer, to visualize interactions and
                      responsibilities.
                    </li>
                    <li>
                      Used AI tools to rapidly prototype UI and workflows,
                      enabling quick validation of core concepts before
                      development.
                    </li>
                    <li>
                      Planned and prioritized the MVP: quotes, messaging,
                      progress tracking, GitHub integration — focusing on
                      automating the most painful manual steps first.
                    </li>
                    <li>
                      Executed 1-week sprints with early pilot feedback from
                      users, iterating quickly to refine functionality and UX.
                    </li>
                  </ul>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Key Features
            </h2>

            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <li key={i} className="list-none">
                    <Card className="h-full">
                      <CardHeader>
                        <div
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${
                            f.colorClass ?? "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle>{f.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p>{f.description}</p>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Outcome & Lessons */}
        <section className="py-12 md:py-16 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-green-50 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Outcome / Results</CardTitle>
                  <ul className="mt-2 ml-5 list-disc text-sm text-gray-700 space-y-1">
                    <li>
                      Clients reported clearer visibility and fewer status
                      meetings
                    </li>
                    <li>Developers stopped manual update emails</li>
                    <li>Single source of truth for all project activity</li>
                    <li>
                      Automated GitHub progress reduced manual reporting work
                    </li>
                  </ul>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-indigo-50 text-indigo-600">
                  <BarChart className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Lessons Learned</CardTitle>
                  <ul className="mt-2 ml-5 list-disc text-sm text-gray-700 space-y-1">
                    <li>
                      Start with one core workflow and automate the worst manual
                      step first
                    </li>
                    <li>
                      Push heavy integrations (webhook processing) to background
                      workers
                    </li>
                    <li>
                      Distinguish client-view vs developer-view to reduce noise
                    </li>
                  </ul>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
