"use client"
import React, { useState } from "react"
import { Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { users, messages } from "@/lib/data"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { cn } from "@/lib/utils"

const getAvatar = (id: string) => {
  return PlaceHolderImages.find(img => img.id === id);
}

export default function MessagesPage() {
  const [selectedUser, setSelectedUser] = useState<keyof typeof messages>('user-2');
  const contacts = Object.keys(messages);

  return (
    <div className="grid min-h-[calc(100vh-8rem)] w-full md:grid-cols-[280px_1fr]">
      <div className="flex-col border-r bg-background hidden md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Conversations</h2>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search contacts..." className="pl-9" />
            </div>
          </div>
          <nav className="grid gap-1 px-4">
            {contacts.map(userId => {
              const user = users[userId as keyof typeof users];
              const avatar = getAvatar(user.avatar);
              return (
                <Button
                  key={userId}
                  variant="ghost"
                  className={cn(
                    "justify-start h-auto py-2",
                    selectedUser === userId && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setSelectedUser(userId as keyof typeof messages)}
                >
                  <Avatar className="h-9 w-9 mr-3">
                     {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-xs text-muted-foreground text-left">
                      {messages[userId as keyof typeof messages].slice(-1)[0].text.substring(0, 25)}...
                    </div>
                  </div>
                </Button>
              )
            })}
          </nav>
        </div>
      </div>
      <div className="flex flex-col">
        {selectedUser && (
          <>
            <div className="flex h-16 items-center border-b px-6">
              <div className="flex items-center gap-3">
                 <Avatar className="h-9 w-9">
                    {(() => {
                        const user = users[selectedUser as keyof typeof users];
                        const avatar = getAvatar(user.avatar);
                        return (
                            <>
                                {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </>
                        );
                    })()}
                </Avatar>
                <h2 className="text-lg font-semibold">{users[selectedUser as keyof typeof users].name}</h2>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6">
                {messages[selectedUser].map((message, index) => (
                  <div key={index} className={cn("flex items-end gap-3", message.from === 'me' ? "justify-end" : "justify-start")}>
                    {message.from === 'them' && (
                        <Avatar className="h-9 w-9">
                           {(() => {
                                const user = users[selectedUser as keyof typeof users];
                                const avatar = getAvatar(user.avatar);
                                return (
                                    <>
                                        {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </>
                                );
                            })()}
                        </Avatar>
                    )}
                    <div className={cn(
                      "max-w-xs lg:max-w-md rounded-lg p-3 text-sm break-words",
                      message.from === 'me'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      <p>{message.text}</p>
                      <p className={cn("text-xs mt-1", message.from === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{message.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t bg-background p-4">
              <div className="relative">
                <Input placeholder="Type a message..." className="pr-16" />
                <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-14">
                  Send
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
