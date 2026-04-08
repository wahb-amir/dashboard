"use client";

import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => string;
  success: (title: string, description?: string) => string;
  error:   (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info:    (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  update:  (id: string, opts: Partial<Omit<Toast, "id">>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#0d9488" strokeWidth="1.2" />
      <path d="M5 8l2 2 4-4" stroke="#0d9488" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.2" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13H1.5L8 2z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 6.5v3M8 11v.5" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#3b82f6" strokeWidth="1.2" />
      <path d="M8 7v4M8 5v.5" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  loading: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="#78716c" strokeWidth="1.4"
        strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  ),
};

const PROGRESS_COLORS: Record<ToastType, string> = {
  success: "bg-teal-500",
  error:   "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
  loading: "bg-stone-500",
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const enter = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(enter);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(t.id), 220);
  }, [t.id, onDismiss]);

  useEffect(() => {
    if (t.type === "loading") return;
    const timer = setTimeout(dismiss, t.duration);
    return () => clearTimeout(timer);
  }, [t.duration, t.type, dismiss]);

  return (
    <div
      className={[
        "relative flex items-start gap-3 overflow-hidden rounded-[10px]",
        "border border-stone-800 bg-stone-950 px-3.5 py-3",
        "shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        "transition-all duration-[280ms]",
        visible && !leaving
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
      ].join(" ")}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0">{ICONS[t.type]}</div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug text-stone-100">
          {t.title}
        </p>
        {t.description && (
          <p className="mt-0.5 text-[11.5px] font-light leading-relaxed text-stone-500">
            {t.description}
          </p>
        )}
      </div>

      {/* Close */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-stone-600 transition-colors hover:text-stone-300 text-[15px] leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ✕
      </button>

      {/* Progress bar */}
      {t.type !== "loading" && (
        <div
          className={`absolute bottom-0 left-0 h-[2px] w-full origin-left ${PROGRESS_COLORS[t.type]}`}
          style={{ animation: `toast-shrink ${t.duration}ms linear forwards` }}
        />
      )}
    </div>
  );
}

let uid = 0;
const genId = () => `t-${++uid}`;
type ToastPosition =
  | "top-left" | "top-center" | "top-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-left":      "top-5 left-5 flex-col",
  "top-center":    "top-5 left-1/2 -translate-x-1/2 flex-col",
  "top-right":     "top-5 right-5 flex-col",
  "bottom-left":   "bottom-5 left-5 flex-col-reverse",
  "bottom-center": "bottom-5 left-1/2 -translate-x-1/2 flex-col-reverse",
  "bottom-right":  "bottom-5 right-5 flex-col-reverse",
};

export function ToastProvider({
  children,
  position = "bottom-right",
}: {
  children: React.ReactNode;
  position?: ToastPosition;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const add = useCallback((opts: Omit<Toast, "id">): string => {
    const id = genId();
    setToasts((prev) => [...prev, { ...opts, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const update = useCallback((id: string, opts: Partial<Omit<Toast, "id">>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...opts } : t)));
  }, []);

  const ctx: ToastContextValue = {
    toast:   (opts) => add({ ...opts, duration: opts.duration ?? 4000 }),
    success: (title, description) => add({ type: "success", title, description, duration: 4000 }),
    error:   (title, description) => add({ type: "error",   title, description, duration: 5000 }),
    warning: (title, description) => add({ type: "warning", title, description, duration: 4500 }),
    info:    (title, description) => add({ type: "info",    title, description, duration: 4000 }),
    loading: (title, description) => add({ type: "loading", title, description, duration: 99999 }),
    dismiss,
    update,
  };

   return (
    <ToastContext.Provider value={ctx}>
      {children}
      {mounted && createPortal(
        <>
          <style>{`@keyframes toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
          <div
            aria-live="polite"
            aria-label="Notifications"
            className={`fixed z-[9999] flex w-[320px] gap-2 ${POSITION_CLASSES[position]}`}
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>
        </>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}