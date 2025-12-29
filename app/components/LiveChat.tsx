"use client";

import React, { useEffect, useRef, useState, FormEvent } from "react";
import { MessageSquare, Send, X, User, Code, Coffee } from "lucide-react";

export type ChatMessage = {
  id: string;
  author: string; // display name
  content: string;
  time: string;
  type?: "message";
};

export interface LiveChatProps {
  userName?: string | null;
  initialMessages?: ChatMessage[]; // optional seed
  maxMessages?: number;
}

/**
 * Floating live chat button + modal. Mock "Chat with Dev" support included.
 * - Floating icon bottom-right
 * - Modal overlay with header, recipient selector (Dev / General)
 * - Mock dev replies (simulated typing delay)
 * - Accessible: Esc to close, backdrop click closes
 */

const formatTime = (d = new Date()) =>
  d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const nowId = (prefix = "m") =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export default function LiveChat({
  userName,
  initialMessages = [],
  maxMessages = 300,
}: LiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recipient, setRecipient] = useState<"Dev" | "General">("General");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.length
      ? initialMessages
      : [
          {
            id: nowId("a"),
            author: "Diana (Client)",
            content: "Can we get an update on the checkout page?",
            time: "10:45 AM",
          },
          {
            id: nowId("a"),
            author: "Alice",
            content: "Sure — pushed latest changes to staging.",
            time: "10:47 AM",
          },
        ]
  );
  const [input, setInput] = useState("");
  const [isDevReplying, setIsDevReplying] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const badgeCountRef = useRef(0);

  // Keep floating unread badge when closed (counts messages from "others")
  useEffect(() => {
    if (!isOpen) badgeCountRef.current = 0;
  }, [isOpen]);

  useEffect(() => {
    // scroll to bottom when messages update
    requestAnimationFrame(() => {
      if (!listRef.current) return;
      listRef.current.scrollTo({ top: listRef.current.scrollHeight });
    });

    // if modal closed and a new message from Dev appears, show badge
    if (!isOpen) {
      const last = messages[messages.length - 1];
      if (last && last.author === "Dev") {
        badgeCountRef.current = (badgeCountRef.current || 0) + 1;
      }
    }
  }, [messages, isOpen]);

  // close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  function openModal() {
    setIsOpen(true);
    badgeCountRef.current = 0;
    // focus input after open (delay to wait for render)
    setTimeout(() => {
      modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 80);
  }

  function closeModal() {
    setIsOpen(false);
  }

  function sendMessage(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const author = userName ?? "You";
    const newMsg: ChatMessage = {
      id: nowId("u"),
      author,
      content: text,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, newMsg].slice(-maxMessages));
    setInput("");

    // If chatting with Dev, simulate a dev reply
    if (recipient === "Dev") {
      setIsDevReplying(true);
      setTimeout(() => {
        const devReply: ChatMessage = {
          id: nowId("dev"),
          author: "Dev",
          content: mockDevReply(text),
          time: formatTime(),
        };
        setMessages((prev) => [...prev, devReply].slice(-maxMessages));
        setIsDevReplying(false);
      }, 700 + Math.floor(Math.random() * 800));
    }
  }

  function mockDevReply(userText: string) {
    // simple mock logic — you can expand this to be fancier
    const lower = userText.toLowerCase();
    if (lower.includes("bug") || lower.includes("error")) {
      return "Thanks — I can reproduce this locally. I'll push a fix to staging and follow up here.";
    }
    if (lower.includes("deploy")) {
      return "Deploy scheduled. I'll notify once it's live.";
    }
    if (lower.includes("thanks") || lower.includes("thx")) {
      return "No problem — happy to help! ☕";
    }
    return "Got it — I'll look into that and update you shortly.";
  }

  function selectDev() {
    setRecipient("Dev");
    // optionally seed Dev-specific messages (mock)
    setMessages((prev) => {
      const seeded = [
        ...prev,
        {
          id: nowId("seed"),
          author: "Dev",
          content: "Hey — you're now chatting with a developer. What's up?",
          time: formatTime(),
        },
      ];
      return seeded.slice(-maxMessages);
    });
    // open modal if closed
    setIsOpen(true);
  }

  // simple accessibility: close when clicking backdrop
  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  return (
    <>
      {/* floating button */}
      <div className="fixed bottom-5 right-5 z-[60]">
        <button
          aria-label="Open live chat"
          onClick={openModal}
          className="group relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 shadow-lg hover:scale-[1.03] transition-transform focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <MessageSquare size={20} className="text-white" />
          {/* small unread badge */}
          {badgeCountRef.current > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center text-xs rounded-full bg-red-500 text-white px-1.5 py-0.5">
              {badgeCountRef.current}
            </span>
          )}
        </button>

        {/* quick dev shortcut */}
        <div className="mt-2 flex justify-end">
          <button
            onClick={selectDev}
            className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-50 border text-xs text-slate-700 shadow-sm hover:bg-slate-100"
            title="Chat with Dev"
          >
            <Code size={14} /> Dev
          </button>
        </div>
      </div>

      {/* modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
          onClick={onBackdropClick}
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-lg mx-4 md:mx-0 md:rounded-lg bg-white shadow-2xl overflow-hidden flex flex-col"
            // prevent clicks inside dialog from closing
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} />
                <div>
                  <div className="text-sm font-semibold text-black">
                    Live Chat
                  </div>
                  <div className="text-xs text-gray-500">
                    {recipient === "Dev" ? "Chatting with Dev" : "General chat"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* recipient toggle */}
                <div className="hidden sm:flex items-center gap-1 bg-gray-50 rounded-md p-1 border">
                  <button
                    onClick={() => setRecipient("General")}
                    className={`px-2 py-1 text-xs rounded text-sm ${
                      recipient === "General"
                        ? "bg-white border shadow-inner"
                        : "text-gray-600"
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setRecipient("Dev")}
                    className={`px-2 py-1 text-xs rounded text-sm ${
                      recipient === "Dev"
                        ? "bg-white border shadow-inner"
                        : "text-gray-600"
                    }`}
                  >
                    <User size={12} className="inline-block mr-1" />
                    Dev
                  </button>
                </div>

                <button
                  aria-label="Close chat"
                  onClick={closeModal}
                  className="p-2 rounded hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* body (messages) */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[70vh] bg-gradient-to-b from-white to-slate-50"
            >
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                    {m.author?.charAt(0) ?? "U"}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-black">
                        {m.author}
                      </div>
                      <div className="text-xs text-gray-500">{m.time}</div>
                    </div>

                    <div className="text-sm text-gray-900 mt-1 break-words">
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}

              {isDevReplying && (
                <div className="flex items-start gap-3 opacity-80">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                    D
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-black">Dev</div>
                    <div className="text-sm text-gray-700 mt-1">Typing…</div>
                  </div>
                </div>
              )}
            </div>

            {/* input */}
            <form
              onSubmit={sendMessage}
              className="px-4 py-3 border-t flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  recipient === "Dev"
                    ? "Message the developer…"
                    : "Say something…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-900"
              />
              <button
                type="submit"
                onClick={sendMessage}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:brightness-95 transition"
              >
                <Send size={14} />
                Send
              </button>
              <button
                type="button"
                onClick={() => {
                  // quick preset: ask for logs/help
                  setInput(
                    "I need help reproducing an issue — here's the reproduction steps..."
                  );
                }}
                className="hidden sm:inline-flex items-center gap-2 ml-2 px-2 py-2 rounded-md bg-slate-100 text-slate-700 text-xs"
                title="Preset message"
              >
                <Coffee size={12} />
                Preset
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
