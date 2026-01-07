"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Check } from "lucide-react";

type ProjectPayload = {
  name: string;
  description: string;
  budget: number | null;
  deadline: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: ProjectPayload) => Promise<void> | void;
};

const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;

// Validation limits
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 1000;
const BUDGET_MIN = 1;
const BUDGET_MAX = 1_000_000;

export default function CreateProjectModal({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  const [budgetRaw, setBudgetRaw] = useState("");
  const [deadline, setDeadline] = useState("");

  const modalRef = useRef<HTMLDivElement | null>(null);

  // compute min date for deadline (today + 2 days)
  const getMinDate = () => {
    const d = new Date(Date.now() + TWO_DAYS_IN_MS);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const minDeadline = getMinDate();

  // auto-expand textarea
  useEffect(() => {
    const t = descRef.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight}px`;
  }, [description]);

  // reset when modal closed / focus first input on open
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(0);
        setSubmitting(false);
        setName("");
        setDescription("");
        setBudgetRaw("");
        setDeadline("");
      }, 160); // allow closing animation
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        const el = document.getElementById(
          "project-name-input"
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

  // helper: parse budget string to number (handles commas)
  const parseBudget = (raw: string) => {
    const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  };

  // validators
  const validateStep = (s: number) => {
    if (s === 0) {
      const nameOk = name.trim().length >= 2;
      const descLen = description.trim().length;
      const descOk = descLen >= DESCRIPTION_MIN && descLen <= DESCRIPTION_MAX;
      return nameOk && descOk;
    }
    if (s === 1) {
      if (budgetRaw.trim() === "") return false;
      const val = parseBudget(budgetRaw);
      if (isNaN(val)) return false;
      if (!isFinite(val)) return false;
      return val >= BUDGET_MIN && val <= BUDGET_MAX;
    }
    if (s === 2) {
      if (!deadline) return false;
      return deadline >= minDeadline;
    }
    return false;
  };

  const formattedBudget = () => {
    if (!budgetRaw) return "";
    const val = parseBudget(budgetRaw);
    if (isNaN(val)) return budgetRaw;
    const opts: Intl.NumberFormatOptions = {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    };
    return val.toLocaleString(undefined, opts);
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(2, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (!validateStep(2)) return;

    const parsedBudget = budgetRaw.trim()
      ? parseBudget(budgetRaw.trim().replace(/,/g, ""))
      : NaN;

    if (
      budgetRaw.trim() &&
      (isNaN(parsedBudget) ||
        parsedBudget < BUDGET_MIN ||
        parsedBudget > BUDGET_MAX)
    ) {
      alert(`Budget must be a number between ${BUDGET_MIN} and ${BUDGET_MAX}.`);
      return;
    }

    setSubmitting(true);
    const payload: ProjectPayload = {
      name: name.trim(),
      description: description.trim(),
      budget: budgetRaw.trim()
        ? parseBudget(budgetRaw.replace(/,/g, ""))
        : null,
      deadline,
    };
    try {
      await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStep(0);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Unable to create project. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // derived UI error states
  const descLen = description.trim().length;
  const descTooShort = descLen > 0 && descLen < DESCRIPTION_MIN;
  const descTooLong = descLen > DESCRIPTION_MAX;

  const budgetVal = parseBudget(budgetRaw);
  const budgetEmpty = budgetRaw.trim() === "";
  const budgetNaN = !budgetEmpty && isNaN(budgetVal);
  const budgetTooSmall = !budgetNaN && !budgetEmpty && budgetVal < BUDGET_MIN;
  const budgetTooLarge = !budgetNaN && !budgetEmpty && budgetVal > BUDGET_MAX;

  const btnDisabled = !validateStep(step) || submitting;
  const btnClass = submitting
    ? "bg-blue-600 text-white"
    : !validateStep(step)
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
      aria-label="Create project"
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
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden transform translate-y-0 transition-all duration-200 mx-auto"
      >
        {/* header + close */}
        <div className="flex items-center gap-4 px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-semibold text-black">
                Create Project
              </div>
              <div className="text-sm text-gray-500">
                A quick 3-step wizard to get started
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
            {["Scope", "Budget", "Deadline"].map((label, i) => {
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

                  {/* progress line */}
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
        <div className="px-6 py-6">
          {/* Step 0: Scope */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="project-name-input"
                  className="block text-sm font-medium text-gray-700"
                >
                  Project name
                </label>
                <input
                  id="project-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. E-commerce revamp"
                  maxLength={100}
                  className="mt-2 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                />
                {name.trim().length > 0 && name.trim().length < 2 && (
                  <div className="mt-1 text-xs text-red-600">
                    Name must be at least 2 characters.
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="project-desc"
                  className="block text-sm font-medium text-gray-700"
                >
                  Project description
                </label>
                <textarea
                  id="project-desc"
                  ref={descRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the goals, scope or anything important. This field will expand as you type."
                  rows={2}
                  maxLength={DESCRIPTION_MAX}
                  aria-invalid={descTooShort || descTooLong}
                  className="mt-2 block w-full rounded-md border px-3 py-2 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <div>
                    {descTooShort && (
                      <span className="text-xs text-red-600">
                        Description is too short (min {DESCRIPTION_MIN} chars).
                      </span>
                    )}
                    {descTooLong && (
                      <span className="text-xs text-red-600">
                        Description is too long (max {DESCRIPTION_MAX} chars).
                      </span>
                    )}
                    {!descTooShort && !descTooLong && (
                      <span className="text-xs text-gray-500">
                        Describe the goals, scope or anything important.
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

          {/* Step 1: Budget */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="budget-input"
                  className="block text-sm font-medium text-gray-700"
                >
                  Budget (USD)
                </label>
                <div className="mt-2 relative">
                  <input
                    id="budget-input"
                    inputMode="numeric"
                    value={budgetRaw}
                    onChange={(e) => {
                      const allowed = e.target.value.replace(/[^\d.,]/g, "");
                      setBudgetRaw(allowed);
                    }}
                    placeholder="e.g. 1,000"
                    maxLength={15}
                    aria-invalid={budgetNaN || budgetTooSmall || budgetTooLarge}
                    className="block w-full rounded-md border px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 px-2">
                    $
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Formatted:{" "}
                  <span className="font-medium">
                    {formattedBudget() || "—"}
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  {budgetEmpty && (
                    <div className="text-xs text-gray-500">
                      Enter an approximate budget in USD.
                    </div>
                  )}
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
                      Budget must be less than or equal to ${BUDGET_MAX}.
                    </div>
                  )}
                  {!budgetEmpty &&
                    !budgetNaN &&
                    !budgetTooSmall &&
                    !budgetTooLarge && (
                      <div className="text-xs text-gray-500">
                        Allowed range: ${BUDGET_MIN.toLocaleString()} — $
                        {BUDGET_MAX.toLocaleString()}.
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Deadline */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="deadline-input"
                  className="block text-sm font-medium text-gray-700"
                >
                  Deadline
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <Clock className="text-gray-600" />
                  <input
                    id="deadline-input"
                    type="date"
                    value={deadline}
                    min={minDeadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Minimum deadline is{" "}
                  <span className="font-medium">{minDeadline}</span> (2 days
                  from today).
                </div>
                {deadline && deadline < minDeadline && (
                  <div className="mt-1 text-xs text-red-600">
                    Deadline must be at least 2 days from today.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* footer / actions */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition ${btnClass}`}
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
                ? "Creating..."
                : "Create Project"}
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {step === 0 && "Step 1: Describe the scope"}
            {step === 1 && "Step 2: Set your budget"}
            {step === 2 && "Step 3: Pick a deadline"}
          </div>
        </div>
      </div>
    </div>,
    target
  );
}
