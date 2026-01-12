"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QuotePayload } from "../Quote/GetQuoteModal";
import { X, Loader2 } from "lucide-react";
import toast,{Toaster} from "react-hot-toast";
interface ConvertQuoteModalProps {
  open: boolean;
  onClose: () => void;
  quote: QuotePayload | null;
  onConfirmed: (project: any) => void;
}

export default function ConvertToProject({
  open,
  onClose,
  quote,
  onConfirmed,
}: ConvertQuoteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [budget, setBudget] = useState<number | string>("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 1. Handle SSR: Ensure we only access document after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Populate form when quote changes
  useEffect(() => {
    if (quote) {
      setName(quote.name);
      setEmail(quote.email || "");
      setBudget(quote.budget ?? "");
      setDeadline(quote.deadline || "");
      setDescription(quote.description || "");
    }
  }, [quote]);

  // Handle Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, open]);

  // 2. Prevent scroll on body when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Don't render if not open, no quote, or not yet mounted (SSR safety)
  if (!open || !quote || !mounted) return null;

const handleSave = async () => {
  if (!name.trim()) {
    toast.error("Name is required");
    return;
  }
  if (!email.trim()) {
    toast.error("Email is required");
    return;
  }

  setSaving(true);

  // Show loading toast and keep its ID
  const loadingToastId = toast.loading("Converting quote to project...");

  try {
    const res = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        budget: budget === "" ? null : Number(budget),
        deadline: deadline || null,
        description: description.trim(),
        sourceQuoteId: quote.id,
        cvtProject: true,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      toast.dismiss(loadingToastId); // dismiss the loading toast
      toast.error(data.message || "Failed to convert quote");
      return;
    }

    toast.success("Quote converted to project successfully!", { id: loadingToastId }); // replaces the loading toast
    onConfirmed(data.project || {});
    onClose();
     setTimeout(() => {
      window.location.reload();
    }, 200);
  } catch (err: any) {
    toast.dismiss(loadingToastId); // make sure loading toast is gone
    toast.error("An unexpected error occurred");
    console.error("ConvertToProject error:", err);
  } finally {
    setSaving(false);
  }
};


  // 3. Render via Portal
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Backdrop click to close */}
      <Toaster position="top-right" reverseOrder={false} />
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-[95%] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Convert Quote</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create a new project from this quote.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          {/* Floating Label: Name */}
          <div className="relative">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="peer block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 placeholder-transparent"
              placeholder="Name"
            />
            <label
              htmlFor="name"
              className="absolute left-3 top-0 z-10 origin-[0] -translate-y-1/2 scale-75 transform bg-white px-1 text-sm text-gray-500 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:scale-100 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-indigo-600 peer-focus:font-medium"
            >
              Project Name
            </label>
          </div>

          {/* Floating Label: Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="peer block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 placeholder-transparent"
              placeholder="Email"
            />
            <label
              htmlFor="email"
              className="absolute left-3 top-0 z-10 origin-[0] -translate-y-1/2 scale-75 transform bg-white px-1 text-sm text-gray-500 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:scale-100 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-indigo-600 peer-focus:font-medium"
            >
              Client Email
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Floating Label: Budget */}
            <div className="relative">
              <input
                type="number"
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="peer block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 placeholder-transparent"
                placeholder="Budget"
              />
              <label
                htmlFor="budget"
                className="absolute left-3 top-0 z-10 origin-[0] -translate-y-1/2 scale-75 transform bg-white px-1 text-sm text-gray-500 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:scale-100 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-indigo-600 peer-focus:font-medium"
              >
                Budget ($)
              </label>
            </div>

            {/* Floating Label: Deadline */}
            <div className="relative">
              <input
                type="date"
                id="deadline"
                value={deadline || ""}
                onChange={(e) => setDeadline(e.target.value)}
                className="peer block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <label
                htmlFor="deadline"
                className="absolute left-3 top-0 z-10 origin-[0] -translate-y-1/2 scale-75 transform bg-white px-1 text-sm text-indigo-600 font-medium"
              >
                Deadline
              </label>
            </div>
          </div>

          {/* Floating Label: Description */}
          <div className="relative">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="peer block w-full rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 placeholder-transparent resize-none"
              placeholder="Description"
            />
            <label
              htmlFor="description"
              className="absolute left-3 top-0 z-10 origin-[0] -translate-y-1/2 scale-75 transform bg-white px-1 text-sm text-gray-500 duration-300 peer-placeholder-shown:top-6 peer-placeholder-shown:scale-100 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-indigo-600 peer-focus:font-medium"
            >
              Project Description
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex items-center gap-2 ${
              saving
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-md"
            }`}
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {saving ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>,
    document.body // This renders the modal outside the main app tree
  );
}
