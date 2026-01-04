"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import GetQuoteModal, {
  QuotePayload,
} from "@/app/components/Quote/GetQuoteModal";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Filter,
} from "lucide-react";

// Helper to format currency
const formatMoney = (amount?: number | null) => {
  if (!amount && amount !== 0) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper for status colors
const getStatusColor = (status: string = "pending") => {
  switch (status.toLowerCase()) {
    case "accepted":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "sent":
      return "bg-blue-100 text-blue-700 border-blue-200";
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

  const filters = ["All", "Pending", "Sent", "Accepted", "Rejected"];

  // Toggle Accordion
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      // Build URL with params
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (searchQuery) params.append("q", searchQuery);
      
      const res = await fetch(`/api/quote?${params.toString()}`);
      const data = await res.json();
      
      if (data.ok) {
        setQuotes(data.quotes || []);
      } else {
        toast.error(data.message || "Failed to load quotes");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  // Reload when filter or search changes
  useEffect(() => {
    // Debounce search slightly in a real app, doing direct here
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]); 

  // Handle Search on Enter key
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes();
  };

  const onRequested = (newQuote: QuotePayload) => {
    setModalOpen(false);
    toast.success("Quote created");
    fetchQuotes(); // Refresh list
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500">Manage your project proposals</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input 
            type="text" 
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {loading ? (
          // Skeleton
          [1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-md border" />
          ))
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
            No quotes found matching your filters.
          </div>
        ) : (
          quotes.map((q) => (
            <div
              key={q.id || (q as any)._id}
              className={`bg-white border rounded-md transition-all duration-200 overflow-hidden ${
                expandedId === (q.id || (q as any)._id) ? "shadow-md ring-1 ring-blue-500/20" : "shadow-sm hover:border-gray-300"
              }`}
            >
              {/* Thinner Header / Collapsed State */}
              <div 
                onClick={() => toggleExpand(q.id || (q as any)._id)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Icon Indicator */}
                  <div className="text-gray-400">
                     {expandedId === (q.id || (q as any)._id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
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
                  
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(q.status)}`}>
                    {q.status || "Pending"}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === (q.id || (q as any)._id) && (
                <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {q.description || "No description provided."}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact</h4>
                        <p className="text-gray-900">{q.email || "No email"}</p>
                      </div>
                      <div>
                         <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Deadline</h4>
                         <p className="text-gray-900">{q.deadline || "Flexible"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar inside Accordion */}
                  <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                     <button className="px-3 py-1 text-xs border bg-white rounded hover:bg-gray-50 text-gray-600">
                        Delete
                     </button>
                     <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                        Convert to Project
                     </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <GetQuoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRequested={onRequested}
      />
    </div>
  );
}