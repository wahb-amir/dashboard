"use client";
import React, { useEffect, useState } from "react";
import GetQuoteModal, {
  QuotePayload,
} from "@/app/components/Quote/GetQuoteModal";

export default function QuotePage() {
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);

      try {
        // TODO: replace mock with real fetch:
        // const res = await fetch('/api/quotes/my'); // your endpoint here
        // if (!res.ok) throw new Error('Failed to fetch');
        // const data = await res.json();
        // setQuote(data);

        // --- mock fetch start ---
        await new Promise((r) => setTimeout(r, 600));
        // Example mock: if user hasn't requested a quote yet, set to null
        const mock: QuotePayload | null = {
          id: "mock-123",
          name: "Wahb (mock)",
          email: "wahb@example.com",
          description: "Design a landing page + contact form",
          budget: 2500,
          deadline: null,
          createdAt: new Date().toISOString(),
          status: "pending",
        };
        // set to `mock` or `null` depending on what you want to show
        if (mounted) setQuote(mock);
        // --- mock fetch end ---
      } catch (err: any) {
        console.error(err);
        if (mounted) setError("Unable to load your quote.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // called when modal successfully creates a quote
  const onRequested = async (q: QuotePayload) => {
    // In real app: you might POST then re-fetch or use returned object.
    // For now we just set local state to the created mock.
    setQuote(q);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your Quote</h1>
            <p className="mt-1 text-sm text-gray-600">
              See the latest quote we have for you, or request a new one.
            </p>
          </div>

          <div>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:brightness-95 transition"
            >
              Request a Quote
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {loading && <div className="text-gray-600">Loading your quote…</div>}
          {!loading && error && <div className="text-red-600">{error}</div>}

          {!loading && !error && !quote && (
            <div className="text-gray-700">
              You don't have a quote yet. Click{" "}
              <button
                onClick={() => setModalOpen(true)}
                className="underline text-blue-600"
              >
                Request a Quote
              </button>{" "}
              to get started.
            </div>
          )}

          {!loading && !error && quote && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-medium text-gray-900">
                    {quote.name}
                  </div>
                  {quote.email && (
                    <div className="text-sm text-gray-500">{quote.email}</div>
                  )}
                </div>

                <div className="text-sm text-gray-500">
                  {quote.createdAt
                    ? new Date(quote.createdAt).toLocaleString()
                    : ""}
                </div>
              </div>

              <div className="text-sm text-gray-700">{quote.description}</div>

              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700">
                  Budget:{" "}
                  <span className="font-medium">
                    {quote.budget != null
                      ? `$${quote.budget.toLocaleString()}`
                      : "Not specified"}
                  </span>
                </div>

                <div className="px-3 py-2 bg-gray-50 rounded text-sm text-gray-700">
                  Deadline:{" "}
                  <span className="font-medium">
                    {quote.deadline || "Not specified"}
                  </span>
                </div>

                <div
                  className={`px-3 py-2 rounded text-sm ${
                    quote.status === "pending"
                      ? "bg-yellow-50 text-yellow-800"
                      : quote.status === "sent"
                      ? "bg-blue-50 text-blue-800"
                      : "bg-green-50 text-green-800"
                  }`}
                >
                  Status: <span className="font-medium">{quote.status}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    // For demo: "download quote" would be implemented here
                    alert("Download feature not implemented in mock.");
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                >
                  Download Quote
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <GetQuoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onRequested={onRequested}
      />
    </div>
  );
}
