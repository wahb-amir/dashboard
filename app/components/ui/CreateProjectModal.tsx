"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Clock, Check } from "lucide-react";

type ProjectPayload = {
  name: string;
  description: string;
  budget: number | null;
  deadline: string; // ISO date (yyyy-mm-dd)
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate?: (payload: ProjectPayload) => Promise<void> | void;
};

const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;

export default function CreateProjectModal({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState(0); // 0: scope, 1: budget, 2: deadline
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  const [budgetRaw, setBudgetRaw] = useState(""); // user input string
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

  // reset when modal closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(0);
        setSubmitting(false);
        setName("");
        setDescription("");
        setBudgetRaw("");
        setDeadline("");
      }, 160); // allow closing animation
    } else {
      // focus first input on open
      setTimeout(() => {
        const el = document.getElementById(
          "project-name-input"
        ) as HTMLInputElement | null;
        el?.focus();
      }, 120);
    }
  }, [open]);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // click outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (!modalRef.current) return;
      if (!modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onClose]);

  // simple validators
  const validateStep = (s: number) => {
    if (s === 0) return name.trim().length >= 2;
    if (s === 1) {
      if (budgetRaw.trim() === "") return false;
      const val = Number(budgetRaw.replace(/,/g, ""));
      return !isNaN(val) && val >= 0;
    }
    if (s === 2) {
      if (!deadline) return false;
      return deadline >= minDeadline;
    }
    return false;
  };

  const formattedBudget = () => {
    if (!budgetRaw) return "";
    // remove non-digit and decimal, then format with commas
    const cleaned = budgetRaw.replace(/[^\d.]/g, "");
    const num = Number(cleaned || 0);
    if (isNaN(num)) return budgetRaw;
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(2, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    // final validation
    if (!validateStep(2)) return;
    setSubmitting(true);
    const payload: ProjectPayload = {
      name: name.trim(),
      description: description.trim(),
      budget: budgetRaw.trim() ? Number(budgetRaw.replace(/,/g, "")) : null,
      deadline,
    };
    try {
      await (onCreate
        ? onCreate(payload)
        : Promise.resolve(console.log("create payload:", payload)));
      // little success animation (optional)
      setStep(0);
      onClose();
    } catch (err) {
      console.error(err);
      // show inline error or toast - keep it simple
      alert("Unable to create project. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    // backdrop
    <div
      className="fixed inset-0 z-60 flex items-center justify-center px-4 sm:px-6"
      aria-modal="true"
      role="dialog"
      aria-label="Create project"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* modal panel */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden transform transition-all duration-200"
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
              <X size={18} />
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
                  className="mt-2 block w-full rounded-md border px-3 py-2 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                />
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
                      // allow numbers, commas, dot
                      const allowed = e.target.value.replace(/[^\d.,]/g, "");
                      setBudgetRaw(allowed);
                    }}
                    placeholder="e.g. 1000"
                    className="block w-full rounded-md border px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
                  />
                  {/* trailing dollar sign */}
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
                {budgetRaw.trim() === "" && (
                  <div className="mt-1 text-xs text-gray-500">
                    Enter an approximate budget in USD.
                  </div>
                )}
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
                // Skip to next or submit
                if (step < 2) {
                  goNext();
                } else {
                  submit();
                }
              }}
              disabled={!validateStep(step) || submitting}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white transition ${
                !validateStep(step) || submitting
                  ? "bg-blue-700 cursor-not-allowed"
                  : "bg-blue-600 hover:brightness-95"
              }`}
            >
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
    </div>
  );
}
