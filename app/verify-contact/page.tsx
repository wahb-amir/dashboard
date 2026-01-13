"use client";

import React, { useEffect, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function VerifyContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Parse uid & token from query string
    try {
    const params = new URLSearchParams(window.location.search);
      const u = params.get("uid");
      const t = params.get("token");
      setUid(u);
      setToken(t);

      if (!u || !t) {
        setMessage("Missing verification parameters in the URL.");
        setStatus("error");
        return;
      }

      // automatically attempt verification on mount
      void verify(u, t);
    } catch (err) {
      setMessage("Failed to read verification link.");
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (u: string, t: string) => {
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/auth/verify-pending-contact", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: u, token: t }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        setMessage((data && (data.message || "Contact email verified.")) || "Contact email verified.");
      } else {
        const msg = (data && (data.message || data.error)) || "Verification failed.";
        setMessage(msg);
        setStatus("error");
      }
    } catch (err) {
      console.error("verify error:", err);
      setMessage("Network error — could not verify.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2 text-gray-900">Verify new contact email</h1>
        <p className="text-sm text-gray-600 mb-6">This page will verify the pending contact email referenced in the link you clicked.</p>

        {status === "loading" && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full border-4 border-t-transparent animate-spin border-blue-600" />
            <div className="text-sm text-gray-700">Verifying — please wait ...</div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-sm text-green-800">{message}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded shadow"
                onClick={() => (window.location.href = "/settings")}
              >
                Go to settings
              </button>
              <button
                className="px-4 py-2 border rounded"
                onClick={() => (window.location.href = "/")}
              >
                Home
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-red-800">{message ?? "Verification failed."}</p>
            </div>

            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded shadow"
                onClick={() => {
                  if (!uid || !token) {
                    setMessage("Missing data in the URL. Ensure the link is complete.");
                    return;
                  }
                  void verify(uid, token);
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {status === "idle" && (
          <div className="text-sm text-gray-700">
            Preparing verification...
          </div>
        )}

        <div className="mt-6 text-xs text-gray-400">If this link doesn't work, copy the full link into your browser or contact support.</div>
      </div>
    </div>
  );
}
