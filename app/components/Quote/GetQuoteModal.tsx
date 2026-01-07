// components/GetQuoteModal.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Check } from "lucide-react";

export type QuotePayload = {
  id?: string;
  name: string;
  email?: string;
  description: string;
  budget?: number | null;
  deadline?: string | null; // yyyy-mm-dd
  createdAt?: string;
  status?: "pending" | "sent" | "accepted" | "rejected";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onRequested?: (q: QuotePayload) => Promise<void> | void; // called after success
};

// Validation constants (tweak if you like)
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;
const BUDGET_MIN = 0;
const BUDGET_MAX = 5_000_000;
const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;

export default function GetQuoteModal({ open, onClose, onRequested }: Props) {
  const [step, setStep] = useState(0); // 0: contact, 1: scope, 2: budget/review
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [budgetRaw, setBudgetRaw] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const getMinDate = () => {
    const d = new Date(Date.now() + TWO_DAYS_IN_MS);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const minDeadline = getMinDate();

  // reset when modal closed / focus when opened
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(0);
        setName("");
        setEmail("");
        setDescription("");
        setBudgetRaw("");
        setDeadline("");
        setSubmitting(false);
      }, 160);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        const el = document.getElementById(
          "quote-name"
        ) as HTMLInputElement | null;
        el?.focus();
      }, 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  // lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const parseBudget = (raw: string) => {
    const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!cleaned) return NaN;
    return Number(cleaned);
  };

  const formattedBudget = () => {
    if (!budgetRaw) return "";
    const val = parseBudget(budgetRaw);
    if (isNaN(val)) return budgetRaw;
    return val.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  };

  const validEmail = (s: string) =>
    s.trim() === "" ? true : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  // per-step validation
  const validateStep = (s: number) => {
    if (s === 0) {
      // contact: name required, email optional but must be valid if present
      return name.trim().length >= 2 && validEmail(email);
    }
    if (s === 1) {
      // scope: description required within limits
      const len = description.trim().length;
      return len >= DESCRIPTION_MIN && len <= DESCRIPTION_MAX;
    }
    if (s === 2) {
      // budget/deadline: budget optional but numeric and within limits; deadline optional but >= min
      if (budgetRaw.trim()) {
        const val = parseBudget(budgetRaw);
        if (isNaN(val) || !isFinite(val)) return false;
        if (val < BUDGET_MIN || val > BUDGET_MAX) return false;
      }
      if (deadline && deadline < minDeadline) return false;
      return true;
    }
    return false;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(2, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    // ensure final step valid
    if (!validateStep(2)) return;
    setSubmitting(true);

    const payload: QuotePayload = {
      id: `mock-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || undefined,
      description: description.trim(),
      budget: budgetRaw.trim() ? parseBudget(budgetRaw) : null,
      deadline: deadline || null,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    try {
      // *** REPLACE THIS MOCK WITH REAL API CALL ***
      await new Promise((r) => setTimeout(r, 900));
      // *** END REPLACE ***

      await (onRequested ? onRequested(payload) : Promise.resolve());
      setStep(0);
      onClose();
    } catch (err) {
      console.error("Quote request failed", err);
      alert("Failed to request quote. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // derived UI states for friendly errors
  const descLen = description.trim().length;
  const descTooShort = descLen > 0 && descLen < DESCRIPTION_MIN;
  const descTooLong = descLen > DESCRIPTION_MAX;

  const budgetVal = parseBudget(budgetRaw);
  const budgetEmpty = budgetRaw.trim() === "";
  const budgetNaN = !budgetEmpty && isNaN(budgetVal);
  const budgetTooSmall = !budgetNaN && !budgetEmpty && budgetVal < BUDGET_MIN;
  const budgetTooLarge = !budgetNaN && !budgetEmpty && budgetVal > BUDGET_MAX;

  const isValid = validateStep(step);
  const btnDisabled = !isValid || submitting;
  const primaryBtnClass = submitting
    ? "bg-blue-600 text-white"
    : !isValid
    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
    : "bg-blue-600 text-white hover:brightness-95";

  // portal mount target
  const target = typeof document !== "undefined" ? document.body : null;
  if (!target) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center px-4 sm:px-6"
      style={{ zIndex: 99999 }}
      aria-modal="true"
      role="dialog"
      aria-label="Request a quote"
    >
      {/* backdrop (click to close) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal panel */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="document"
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden transform translate-y-0 transition-all duration-200 mx-auto flex flex-col max-h-[90vh]"
      >
        {/* header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-semibold text-black">
                Request a Quote
              </div>
              <div className="text-sm text-gray-500">
                A short 3-step form to get you a price
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-sm text-gray-500">{step + 1} / 3</div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 transition"
            >
              <X size={18} className="text-black" />
            </button>
          </div>
        </div>

        {/* steps indicator */}
        <div className="px-6 py-3 border-b">
          <div className="flex items-center gap-4">
            {["Contact", "Scope", "Budget"].map((label, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <div key={label} className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                        done
                          ? "bg-green-500 text-white"
                          : active
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {done ? <Check size={14} /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-medium ${
                          active ? "text-black" : "text-gray-500"
                        }`}
                      >
                        {label}
                      </div>
                    </div>
                  </div>

                  {i < 2 && (
                    <div className="mt-3 h-1 bg-gray-100 rounded-full">
                      <div
                        className={`h-1 rounded-full ${
                          i < step
                            ? "bg-green-500"
                            : active
                            ? "bg-blue-600"
                            : "bg-gray-100"
                        }`}
                        style={{
                          width: i < step ? "100%" : active ? "60%" : "4%",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {/* Step 0: Contact */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="quote-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Your name
                </label>
                <input
                  id="quote-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="mt-2 block w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
                  maxLength={100}
                />
                {name.trim().length > 0 && name.trim().length < 2 && (
                  <div className="mt-1 text-xs text-red-600">
                    Name must be at least 2 characters.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="quote-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email (optional)
                </label>
                <input
                  id="quote-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-2 block w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {!validEmail(email) && (
                  <div className="mt-1 text-xs text-red-600">
                    Invalid email address.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Scope */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="quote-desc"
                  className="block text-sm font-medium text-gray-700"
                >
                  Project description
                </label>
                <textarea
                  id="quote-desc"
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the goals, deliverables, timeline, etc."
                  rows={4}
                  maxLength={DESCRIPTION_MAX}
                  className="mt-2 block w-full rounded-md border px-3 py-2 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-300 text-black h-32"
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div>
                    {descTooShort && (
                      <span className="text-xs text-red-600">
                        Description too short (min {DESCRIPTION_MIN}).
                      </span>
                    )}
                    {descTooLong && (
                      <span className="text-xs text-red-600">
                        Description too long (max {DESCRIPTION_MAX}).
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {description.trim().length}/{DESCRIPTION_MAX}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Budget & Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="quote-budget"
                  className="block text-sm font-medium text-gray-700"
                >
                  Budget (USD, optional)
                </label>
                <div className="mt-2 relative">
                  <input
                    id="quote-budget"
                    inputMode="numeric"
                    value={budgetRaw}
                    onChange={(e) =>
                      setBudgetRaw(e.target.value.replace(/[^\d.,]/g, ""))
                    }
                    placeholder="e.g. 2,500"
                    className="block w-full rounded-md border px-3 py-2 pr-12 text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 px-2">
                    $
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Formatted:{" "}
                  <span className="font-medium">
                    {formattedBudget() || "—"}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  {budgetNaN && (
                    <div className="text-xs text-red-600">Invalid number.</div>
                  )}
                  {budgetTooSmall && (
                    <div className="text-xs text-red-600">
                      Budget must be at least ${BUDGET_MIN}.
                    </div>
                  )}
                  {budgetTooLarge && (
                    <div className="text-xs text-red-600">
                      Budget must be ≤ ${BUDGET_MAX.toLocaleString()}.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="quote-deadline"
                  className="block text-sm font-medium text-gray-700"
                >
                  Preferred deadline (optional)
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <Clock className="text-gray-600" />
                  <input
                    id="quote-deadline"
                    type="date"
                    min={minDeadline}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                  />
                </div>
                {deadline && deadline < minDeadline && (
                  <div className="mt-1 text-xs text-red-600">
                    Deadline must be at least 2 days from today.
                  </div>
                )}
              </div>

              {/* Review block */}
              <div className="pt-2 border-t">
                <div className="text-sm text-gray-600 mb-2">Review</div>
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-800 max-h-48 overflow-y-auto">
                  <div className="font-medium">{name || "—"}</div>
                  {email && (
                    <div className="text-xs text-gray-600">{email}</div>
                  )}
                  <div className="mt-2 whitespace-pre-wrap">
                    {description || "—"}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs">
                    <div>
                      {/* Budget:{" "}
                      <span className="font-medium">
                        {budgetRaw ? `$${formattedBudget()}` : "Not specified"}
                      </span> */}
                    </div>
                    <div>
                      {/* Deadline:{" "}
                      <span className="font-medium">
                        {deadline || "Not specified"}
                      </span> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goBack}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
              >
                Back
              </button>
            )}

            <button
              onClick={() => {
                if (step < 2) goNext();
                else submit();
              }}
              disabled={btnDisabled}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition ${primaryBtnClass}`}
            >
              {submitting && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              )}
              {step < 2
                ? "Next"
                : submitting
                ? "Requesting..."
                : "Request Quote"}
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {step === 0 && "Step 1: Contact info"}
            {step === 1 && "Step 2: Describe the scope"}
            {step === 2 && "Step 3: Budget & review"}
          </div>
        </div>
      </div>
    </div>,
    target
  );
}
