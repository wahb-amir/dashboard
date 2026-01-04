"use client"

import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { notifications } from "@/lib/data"
import { Badge } from "../ui/badge"

export function NotificationsDropdown() {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
             <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.map((notification) => (
          <DropdownMenuItem key={notification.id} className="flex items-start gap-3">
            <div className={`mt-1 h-2 w-2 rounded-full ${notification.read ? 'bg-transparent' : 'bg-accent'}`} />
            <div className="grid gap-1">
              <p className="font-medium">{notification.title}</p>
              <p className="text-xs text-muted-foreground">{notification.description}</p>
              <p className="text-xs text-muted-foreground">{notification.time}</p>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center">
            <Button variant="ghost" size="sm" className="w-full">
                <Check className="mr-2 h-4 w-4" />
                Mark all as read
            </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
