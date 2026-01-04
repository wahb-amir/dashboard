"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Briefcase,
  FileText,
  Home,
  MessageSquare,
  Package,
  Settings,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/quotes", icon: FileText, label: "Quote Requests", badge: "3" },
  { href: "/dashboard/messages", icon: MessageSquare, label: "Messages", badge: "1" },
  { href: "/dashboard/projects", icon: Briefcase, label: "Projects" },
];

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <TooltipProvider>
    <nav className="flex flex-col items-center gap-4 px-2 sm:py-4 h-full">
      <Link
        href="/"
        className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
      >
        <Package className="h-4 w-4 transition-all group-hover:scale-110" />
        <span className="sr-only">Dashboard</span>
      </Link>
      <div className="flex flex-col items-center gap-3 rounded-lg">
        {navItems.map((item) => (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8 relative",
                  { "bg-accent text-accent-foreground": pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') }
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.badge && <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">{item.badge}</Badge>}
                <span className="sr-only">{item.label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center gap-3 rounded-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                 { "bg-accent text-accent-foreground": pathname === "/dashboard/settings" }
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </nav>
    </TooltipProvider>
  )
}
