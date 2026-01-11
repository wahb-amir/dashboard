"use client";

import React, { useEffect } from "react";
import { X, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteQuoteModal({
  open,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-sm bg-white rounded-xl shadow-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 text-red-600 font-semibold">
            <Trash2 size={18} />
            Delete Quote
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-gray-700">
          Are you sure you want to delete this quote?  
          <span className="block mt-2 text-red-600 font-medium">
            This action cannot be undone.
          </span>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
