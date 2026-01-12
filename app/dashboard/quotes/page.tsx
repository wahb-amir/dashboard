"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ConvertToProject from "@/app/components/Projects/ConvertToProject";
import DeleteQuoteModal from "@/app/components/Quote/DeleteQuoteModal";
import GetQuoteModal from "@/app/components/Quote/GetQuoteModal";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { QuoteStatus } from "@/app/components/Quote/GetQuoteModal";
/** --- Types --- **/
type ServerQuote = {
  _id?: string;
  id?: string;
  userId?: string;
  name: string;
  email?: string;
  description?: string;
  budget?: number | null;
  deadline?: string | null;
  status?: "pending" | "reviewing" | "sent" | "accepted" | "rejected";
  createdAt?: string;
  updatedAt?: string;
  cvtProject?: boolean;
};

type QuotePayload = {
  id: string;
  name: string;
  email?: string;
  description: string;
  budget: number | null;
  deadline: string | null;
  status: QuoteStatus;
  createdAt: string;
  cvtProject: boolean;
};

const mapServerQuoteToPayload = (q: ServerQuote): QuotePayload => {
  if (!q._id && !q.id) {
    throw new Error("Quote missing id");
  }

  return {
    id: String(q.id ?? q._id), // GUARANTEED string
    name: q.name,
    email: q.email,
    description: q.description ?? "",
    budget: q.budget ?? null,
    deadline: q.deadline ?? null,
    status: q.status ?? "pending",
    createdAt: q.createdAt ?? new Date().toISOString(),
     cvtProject: q.cvtProject ?? false,
  };
};

/** Helper to format currency */
const formatMoney = (amount?: number | null) => {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Helper for status colors */
const getStatusColor = (status: QuoteStatus = "pending") => {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "sent":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "reviewing":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
};

export default function QuotePage() {
  const [quotes, setQuotes] = useState<QuotePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // UI State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null); // which quote id is in the "are you sure?" modal
  const [deletingId, setDeletingId] = useState<string | null>(null); // currently deleting id (shows loader)

  const filters = ["All", "Pending", "Sent", "Accepted", "Rejected"];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuotePayload | null>(null);

  const handleConvert = (quote: QuotePayload) => {
    // Your conversion logic here, e.g., call API
    console.log("Converting quote to project:", quote);
    setConvertModalOpen(false);
  };

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All")
        params.append("status", statusFilter.toLowerCase());
      if (searchQuery) params.append("q", searchQuery);

      const res = await fetch(`/api/quote?${params.toString()}`);
      // require server to respond with proper ok flag and quotes array
      if (!res.ok) {
        // try to parse error message for nicer toast
        const errBody = await res.json().catch(() => ({}));
        toast.error(errBody.message || "Failed to load quotes");
        setQuotes([]);
        return;
      }

      const data = await res.json();
      if (data?.ok) {
        // map server quotes -> UI payloads
        const mapped: QuotePayload[] = (data.quotes || []).map(
          mapServerQuoteToPayload
        );
        setQuotes(mapped);
      } else {
        toast.error(data?.message || "Failed to load quotes");
        setQuotes([]);
      }
    } catch (error) {
      console.error("fetchQuotes error:", error);
      toast.error("Network error");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Debounce filter/search changes
  useEffect(() => {
    const t = setTimeout(() => {
      fetchQuotes();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchQuotes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes();
  };

  /**
   * Called by the modal AFTER successful server save.
   * The modal should pass the server quote object (data.quote).
   */
  const closeTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      // cleanup timer and any leftover body padding
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      document.body.style.paddingRight = "";
    };
  }, []);

  // Open modal without causing layout shift: apply padding-right equal to scrollbar width first
  const openModal = () => {
    if (typeof window === "undefined") {
      setModalOpen(true);
      return;
    }
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      // apply padding to preserve layout when modal's body overflow hidden kicks in
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    // open modal (the modal component will set overflow:hidden)
    setModalOpen(true);
  };

  // Close modal and remove padding after transition (match modal transition duration ~200-240ms)
  const closeModal = () => {
    setModalOpen(false);
    // clear any existing timer
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      document.body.style.paddingRight = "";
      closeTimer.current = null;
    }, 240); // match your modal's transition duration (200ms previously)
  };

  const onRequested = (serverQuote: ServerQuote | QuotePayload) => {
    // close via our handler so padding is cleaned up properly
    closeModal();
    toast.success("Quote created");

    const payload =
      // @ts-ignore
      (serverQuote as QuotePayload).id
        ? (serverQuote as QuotePayload)
        : mapServerQuoteToPayload(serverQuote as ServerQuote);

    // instant UI update — prepend
    setQuotes((prev) => [payload, ...prev]);
  };

  // --- Delete flow ---
  async function handleDeleteQuote(quoteId: string) {
    if (deletingId) return; // prevent double submit
    setDeletingId(quoteId);

    try {
      const res = await fetch(`/api/quote/${quoteId}`, {
        method: "DELETE",
      });

      // try parse JSON if present
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore parse errors (empty body)
      }

      if (!res.ok) {
        const errMsg =
          data?.message || `Request failed with status ${res.status}`;
        toast.error(errMsg);
        return;
      }

      if (!data?.ok) {
        toast.error(data?.message || "Failed to delete quote");
        return;
      }

      // success
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      toast.success("Quote deleted 🗑️");

      // close the confirmation modal if open
      setDeleteId((current) => (current === quoteId ? null : current));
    } catch (error) {
      console.error("handleDeleteQuote error:", error);
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500">Manage your project proposals</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
        >
          <FileText size={16} /> New Quote
        </button>
      </div>

      {/* Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-2 rounded-lg border shadow-sm">
        {/* Filter Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-md overflow-x-auto w-full sm:w-auto">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                statusFilter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-64">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={14}
          />
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
        </form>
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 animate-pulse rounded-md border"
            />
          ))
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
            No quotes found matching your filters.
          </div>
        ) : (
          quotes.map((q) => (
            <div
              key={q.id}
              className={`bg-white border rounded-md transition-all duration-200 overflow-hidden ${
                expandedId === q.id
                  ? "shadow-md ring-1 ring-blue-500/20"
                  : "shadow-sm hover:border-gray-300"
              }`}
            >
              {/* Thinner Header / Collapsed State */}
              <div
                onClick={() => toggleExpand(q.id)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Icon Indicator */}
                  <div className="text-gray-400">
                    {expandedId === q.id ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="font-semibold text-sm text-gray-900 truncate w-32 md:w-48">
                      {q.name}
                    </span>
                    <span className="text-xs text-gray-500 hidden sm:block">
                      {new Date(q.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-700 hidden sm:block">
                    {formatMoney(q.budget)}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(
                      q.status
                    )}`}
                  >
                    {q.status || "Pending"}
                  </span>
                </div>
              </div>

              {/* Expanded Details (compact, not stretching) */}
              {expandedId === q.id && (
                <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100 text-sm">
                  <div className="flex flex-col md:flex-row gap-4 mt-2">
                    {/* Description column: grows, fixed height textarea for notepad feel */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Description
                      </h4>

                      <textarea
                        readOnly
                        value={q.description || ""}
                        placeholder="No description provided."
                        className="w-full h-36 md:h-32 p-3 bg-white border rounded-md resize-none overflow-auto text-sm text-gray-700 font-sans shadow-inner focus:outline-none"
                      />

                      {!q.description && (
                        <div className="mt-2 text-xs text-gray-500">
                          No description provided.
                        </div>
                      )}
                    </div>

                    {/* Right column: fixed width so it doesn't push the description wide */}
                    <div className="w-full md:w-56 flex-shrink-0 space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Contact
                        </h4>
                        <p className="text-gray-900 truncate">
                          {q.email || "No email"}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Deadline
                        </h4>
                        <p className="text-gray-900">
                          {q.deadline || "Flexible"}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Budget
                        </h4>
                        <p className="text-gray-900">{formatMoney(q.budget)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar inside Accordion */}
                <div className="mt-4 pt-3 border-t flex justify-end gap-2">
  <button
    className="px-3 py-1 text-xs border bg-white rounded hover:bg-gray-50 text-gray-600"
    onClick={(e) => {
      e.stopPropagation();
      setDeleteId(q.id); // open confirm modal
    }}
  >
    Delete
  </button>

{!q.cvtProject && (
  <button
    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
    onClick={() => {
      setSelectedQuote(q);
      setConvertModalOpen(true);
    }}
  >
    Convert to Project
  </button>
)}
</div>

{selectedQuote && !selectedQuote.cvtProject && (
  <ConvertToProject
    open={convertModalOpen}
    onClose={() => setConvertModalOpen(false)}
    quote={selectedQuote}
    onConfirmed={handleConvert}
  />
)}

                </div>
              )}
            </div>
          ))
        )}
      </div>

      <GetQuoteModal
        open={modalOpen}
        onClose={closeModal}
        onRequested={onRequested}
      />

      <DeleteQuoteModal
        open={!!deleteId}
        loading={deletingId === deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDeleteQuote(deleteId)}
      />
    </div>
  );
}
