import { Button } from "@/components/ui/button";
import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const features = [
    {
      title: "Quote Requests",
      description:
        "Clients can easily request quotes for new projects, providing all necessary details upfront.",
    },
    {
      title: "Live Messaging",
      description:
        "Real-time chat between clients and developers, keeping communication fluid and centralized.",
    },
    {
      title: "Progress Tracking",
      description:
        "Visualize project progress with automated updates from GitHub activity.",
    },
    {
      title: "GitHub Integration",
      description:
        "Seamlessly sync your repos, commits, and pull requests to automate progress reporting.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="#" className="flex items-center font-bold" prefetch={false}>
            <ArrowRight className="h-6 w-6" />
            <span className="ml-2">Dashboard</span>
          </Link>
          <nav className="ml-auto flex items-center gap-4">
            <Button asChild>
              <Link href="/dashboard">
                Dashboard
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Effortless Client & Developer Collaboration
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Replaces fragmented emails and chats with a single platform
                    for quotes, messaging, and automated progress reporting.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/dashboard">
                      Dashboard
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="#learn-more">
                      Learn More
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="learn-more" className="py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Key Features
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  A Single Source of Truth. From initial quote to final
                  delivery, manage your entire project lifecycle in one place.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-4 mt-12">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Case Study
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Client & Developer Collaboration Platform
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
                  A single-platform collaboration tool that replaced
                  fragmented email/chat processes and automated progress
                  reporting — improving transparency and reducing manual status
                  updates.
                </p>
                <Button asChild>
                  <a
                    href="https://github.com/wahb-amir/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="mr-2 h-4 w-4" /> View Repo
                  </a>
                </Button>
              </div>
              <div className="grid gap-6">
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Role</div>
                  <p className="text-muted-foreground">
                    Full-Stack Engineer — owned end-to-end design and
                    implementation of client & developer workflows, GitHub
                    integration, and CI/CD automation.
                  </p>
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Constraints</div>
                  <p className="text-muted-foreground">
                    MVP in 8 weeks, role-based access, secure logins,
                    enterprise-grade data isolation, limited budget for external
                    integrations.
                  </p>
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Problem</div>
                  <p className="text-muted-foreground">
                    Clients and developers relied on email, chat and
                    spreadsheets to track work. This caused missed updates,
                    unclear ownership, and frequent status-check requests.
                  </p>
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">Approach</div>
                  <p className="text-muted-foreground">
                    Interviewed 5 users (clients & developers) to understand
                    real pain points and workflow bottlenecks. Mapped user
                    journeys for three key personas: client, manager, developer,
                    to visualize interactions and responsibilities. Used AI
                    tools to rapidly prototype UI and workflows, enabling quick
                    validation of core concepts before development. Planned and
                    prioritized the MVP: quotes, messaging, progress tracking,
                    GitHub integration — focusing on automating the most painful
                    manual steps first. Executed 1-week sprints with early pilot
                    feedback from users, iterating quickly to refine
                    functionality and UX.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-16">
              <h3 className="text-2xl font-bold mb-4">Key Features</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Quote Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Clients can request quotes for new projects, providing
                      necessary details upfront so work starts with clear scope.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Live Messaging</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Real-time chat between clients and developers keeps
                      communication direct and reduces email noise.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Visualize project progress with automated updates from
                      development activity and commits.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>GitHub Integration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Sync repos, commits, and pull requests to automate
                      progress reporting and reduce manual status updates.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-4">
                 <h3 className="text-2xl font-bold">Outcome / Results</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Clients reported clearer visibility and fewer status meetings</li>
                    <li>Developers stopped manual update emails</li>
                    <li>Single source of truth for all project activity</li>
                    <li>Automated GitHub progress reduced manual reporting work</li>
                  </ul>
              </div>
                <div className="space-y-4">
                 <h3 className="text-2xl font-bold">Lessons Learned</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Start with one core workflow and automate the worst manual step first</li>
                    <li>Push heavy integrations (webhook processing) to background workers</li>
                    <li>Distinguish client-view vs developer-view to reduce noise</li>
                  </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Dashboard. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
