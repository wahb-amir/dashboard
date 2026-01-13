import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast, { Toaster } from "react-hot-toast";

type Step =
  | "send-code"
  | "enter-code"
  | "update-email"
  | "change-password"
  | "complete";

interface VerifyModalProps {
  show: boolean;
  onClose: () => void;
  userEmail?: string;
  verifyForAction: "update-contact" | "change-password";
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  onVerify: () => void; // called once flow completes successfully (password change or final actions)
  saving: boolean;
}

export default function VerifyModal({
  show,
  onClose,
  userEmail,
  verifyForAction,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  onVerify,
  saving,
}: VerifyModalProps) {
  const elRef = useRef<HTMLDivElement | null>(
    typeof document !== "undefined" ? document.createElement("div") : null
  );
  const [step, setStep] = useState<Step>("send-code");
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // pending info (may come from a previous flow or from userinfo)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null); // raw pending email if provided by API
  const [pendingEmailMasked, setPendingEmailMasked] = useState<string | null>(null);
  const [fetchingUserInfo, setFetchingUserInfo] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const ROOT_ID = "verify-modal-root";
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      root.dataset.modalRoot = "true";
      document.body.appendChild(root);
    }
    root.appendChild(el);
    return () => {
      if (el.parentElement === root) root.removeChild(el);
      if (root.childElementCount === 0 && root.dataset.modalRoot === "true")
        root.remove();
    };
  }, []);

  // When a pendingEmail is discovered (from fetchUserInfo), switch to the complete view.
  useEffect(() => {
    if (pendingEmail) {
      setStep("complete");
    }
  }, [pendingEmail]);

  useEffect(() => {
    if (!show) {
      setStep("send-code");
      setCode("");
      setConfirmPassword("");
      setPendingEmail(null);
      setPendingEmailMasked(null);
      setLoading(false);
    } else {
      // when opened, fetch latest userinfo (to get pendingContactEmail if there's one)
      fetchUserInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const maskEmail = (email: string | null) => {
    if (!email || !email.includes("@")) return email ?? "";
    const [local, domain] = email.split("@");
    const visible = 2;
    const visibleLocal = local.slice(0, Math.max(0, visible));
    const maskedLocal =
      visibleLocal + "*".repeat(Math.max(0, local.length - visibleLocal.length));
    return `${maskedLocal}@${domain}`;
  };

  const fetchUserInfo = async () => {
    setFetchingUserInfo(true);
    try {
      const res = await fetch("/api/auth/userinfo", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      const pendingRaw = data?.user?.pendingContactEmail ?? null;
      const pendingMasked = data?.user?.pendingContactEmailMasked ?? null;

      if (pendingRaw) {
        setPendingEmail(pendingRaw);
        setPendingEmailMasked(pendingMasked || maskEmail(pendingRaw));
        // DO NOT set step here — the pendingEmail effect will set the step
      } else {
        // clear if none
        setPendingEmail(null);
        setPendingEmailMasked(null);
      }
    } catch (err) {
      console.warn("fetchUserInfo error:", err);
    } finally {
      setFetchingUserInfo(false);
    }
  };

  if (!show || !elRef.current) return null;

  // Step 1: POST to send verification code
  const sendVerification = async () => {
    const emailToUse = userEmail?.trim() || "";
    if (!emailToUse) {
      toast.error("No client contact email available to send the code to.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) || "Failed to send code.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success(`Verification code sent to ${maskEmail(emailToUse)}. Check your inbox.`);
      setStep("enter-code");
    } catch (err) {
      console.error("sendVerification error:", err);
      toast.error("Network error — could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code. include credentials to allow server to set one-time cookie
  const handleVerify = async () => {
    if (!code.trim()) {
      toast.error("Please enter the verification code.");
      return;
    }

    if (!currentPassword.trim()) {
      toast.error("Please enter your current password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          code: code.trim(),
          email: userEmail?.trim() || "",
          currentPassword: currentPassword.trim(),
          action: verifyForAction,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) || "Verification failed.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success("Verified successfully.");

      if (verifyForAction === "update-contact") {
        setStep("update-email");
        // refresh userinfo to ensure any server-state is picked up
        fetchUserInfo();
      } else {
        setStep("change-password");
      }
    } catch (err) {
      console.error("handleVerify error:", err);
      toast.error("Network error — could not verify code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: create pending contact email (now only supports using the client email)
  const handleUpdateContact = async (emailParam?: string) => {
    const emailToUpdate = (emailParam || "").trim();
    if (!emailToUpdate) {
      toast.error("No contact email available to set as pending.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailToUpdate)) {
      toast.error("Client contact email seems invalid.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/update-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ newContactEmail: emailToUpdate }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          "Failed to set pending contact email.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      const masked =
        (data && (data.pendingContactEmailMasked || data.pendingContactEmail)) ||
        maskEmail(emailToUpdate);

      setPendingEmail(emailToUpdate);
      setPendingEmailMasked(masked);

      toast.success("Pending contact email saved. Check your inbox for a verification link.");

      // Do NOT call onVerify() here — verification via email required.
      setStep("complete");
    } catch (err) {
      console.error("handleUpdateContact error:", err);
      toast.error("Network error — could not update contact email.");
    } finally {
      setLoading(false);
    }
  };

  // Resend verification link handler
  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      const res = await fetch("/api/auth/resend-pending-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          "Failed to resend verification email.";
        toast.error(msg);
        setResendLoading(false);
        return;
      }

      // update pending mask if api returned fresh value
      if (data.pendingContactEmailMasked) setPendingEmailMasked(data.pendingContactEmailMasked);
      if (data.pendingContactEmail) setPendingEmail(data.pendingContactEmail);

      toast.success("Verification email resent — check your inbox.");

      // log dev-only link if provided
      if (data.devVerificationLink) {
        // dev helper: console log the link (do not show in production)
        // eslint-disable-next-line no-console
        console.info("[dev] verification link:", data.devVerificationLink);
      }
    } catch (err) {
      console.error("handleResendVerification error:", err);
      toast.error("Network error — could not resend verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  // Step 3 alternative: change password (unchanged)
  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newPassword: newPassword.trim(),
          currentPassword: currentPassword.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          "Failed to change password.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success("Password changed successfully.");
      setStep("complete");

      try {
        onVerify();
      } catch (e) {
        console.warn("onVerify callback error:", e);
      }
    } catch (err) {
      console.error("handleChangePassword error:", err);
      toast.error("Network error — could not change password.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded p-6 w-full max-w-md relative">
        <Toaster position="top-right" containerClassName="!z-[10000]" />
        <h3 className="text-lg font-medium mb-2 text-black">
          {verifyForAction === "update-contact"
            ? "Verify & Update Contact Email"
            : "Verify & Change Password"}
        </h3>

        {/* OUTSIDE TAG: show pending (unverified) email prominently outside the email selection area */}
        {pendingEmailMasked && (
          <div className="mb-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-sm">
              <span className="font-medium text-yellow-800">{pendingEmailMasked}</span>
              <span className="text-xs text-yellow-700">Unverified</span>
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="ml-2 text-xs px-2 py-1 border rounded bg-white text-gray-800"
              >
                {resendLoading ? "Resending..." : "Resend"}
              </button>
            </div>
          </div>
        )}

        {step === "send-code" && (
          <>
            <p className="text-sm text-gray-800 mb-4">
              We will send a verification code to
              <strong className="ml-1">
                {userEmail ? maskEmail(userEmail) : "your login email"}
              </strong>
              .
            </p>

            {/* show client contact email as a tag instead of an input */}
            <div className="mb-3">
              {userEmail ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.94 6.94a1.5 1.5 0 012.12 0L10 11.88l4.94-4.94a1.5 1.5 0 112.12 2.12l-6 6a1.5 1.5 0 01-2.12 0l-6-6a1.5 1.5 0 010-2.12z" />
                  </svg>
                  <span>{maskEmail(userEmail)}</span>
                  <span className="ml-2 text-xs text-gray-500">client</span>
                </span>
              ) : (
                <span className="text-sm text-gray-500">No client contact email available.</span>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={onClose}
                className="px-3 py-2 border rounded text-sm text-black"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={sendVerification}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                disabled={loading || !userEmail}
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            </div>
          </>
        )}

        {step === "enter-code" && (
          <>
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-black"
            />
            <input
              type="text"
              placeholder="Enter Verification Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-black"
              autoFocus
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm"></div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("send-code")}
                  className="px-3 py-2 border rounded text-sm text-black"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleVerify}
                  className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          </>
        )}

        {step === "update-email" && (
          <>
            <p className="text-sm text-gray-800 mb-3">Using client email as the contact address.</p>

            <div className="mb-3 flex flex-wrap gap-2 items-center">
              {userEmail ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.94 6.94a1.5 1.5 0 012.12 0L10 11.88l4.94-4.94a1.5 1.5 0 112.12 2.12l-6 6a1.5 1.5 0 01-2.12 0l-6-6a1.5 1.5 0 010-2.12z" />
                  </svg>
                  <span>{maskEmail(userEmail)}</span>
                  <span className="ml-2 text-xs text-gray-500">current</span>
                </span>
              ) : (
                <span className="text-sm text-gray-500">No current contact email (login email will be used)</span>
              )}
            </div>

            {/* If there's an already pending email, show it and a resend option inside the modal too */}
            {pendingEmailMasked && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-sm text-black">
                    <span>{pendingEmailMasked}</span>
                    <span className="ml-2 text-xs text-yellow-700">pending verification</span>
                  </div>
                  {pendingEmail && (
                    <div className="text-xs text-gray-500 mt-1">Pending email: {pendingEmail}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleResendVerification}
                    className="px-3 py-1 border rounded text-sm text-black"
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Resending..." : "Resend link"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => handleUpdateContact(userEmail)}
                className="px-3 py-2 border rounded text-sm text-black"
                disabled={loading || !userEmail}
                title="Use current client/login email"
              >
                {loading ? "Processing..." : "Use Client"}
              </button>

              <button
                onClick={() => {
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </>
        )}

        {step === "change-password" && (
          <>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-black"
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-black"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={handleChangePassword}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm"
                disabled={loading}
              >
                {loading ? "Saving..." : "Change Password"}
              </button>
            </div>
          </>
        )}

        {step === "complete" && (
          <div className="text-center">
            {pendingEmailMasked ? (
              <>
                <p className="mb-4 text-gray-800">Pending contact email <strong>{pendingEmailMasked}</strong> saved — verification required.</p>
                {pendingEmail && (
                  <p className="mb-2 text-sm text-gray-600">Pending email: {pendingEmail}</p>
                )}
                <p className="mb-4 text-sm text-gray-600">Until you verify the new address via the email link, your app will continue using the current contact email (or your login email if no contact email exists).</p>

                <div className="flex justify-center gap-2">
                  <button
                    onClick={handleResendVerification}
                    className="px-3 py-2 border rounded text-sm text-black"
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Resending..." : "Resend verification"}
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-gray-800">All set — action completed successfully.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, elRef.current);
}
