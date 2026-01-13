"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast, { Toaster } from "react-hot-toast";

type Step = "send-code" | "enter-code" | "update-email" | "change-password" | "complete";

interface VerifyModalProps {
  show: boolean;
  onClose: () => void;
  userEmail?: string;
  verifyForAction: "update-contact" | "change-password";
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  onVerify: () => void; // called once flow completes successfully
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

  // new state for when userEmail is not provided
  const [enteredEmail, setEnteredEmail] = useState("");
  const [updatedEmail, setUpdatedEmail] = useState("");

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

  useEffect(() => {
    if (!show) {
      setStep("send-code");
      setCode("");
      setConfirmPassword("");
      setEnteredEmail("");
      setUpdatedEmail("");
      setLoading(false);
    }
  }, [show]);

  const maskEmail = (email: string) => {
    if (!email || !email.includes("@")) return email ?? "";
    const [local, domain] = email.split("@");
    const visible = 2;
    const visibleLocal = local.slice(0, Math.max(0, visible));
    const maskedLocal =
      visibleLocal + "*".repeat(Math.max(0, local.length - visibleLocal.length));
    return `${maskedLocal}@${domain}`;
  };

  if (!show || !elRef.current) return null;

  // Step 1: POST to send verification code (unchanged route as requested)
  const sendVerification = async () => {
    const emailToUse = userEmail?.trim() || enteredEmail.trim();
    if (!emailToUse) {
      toast.error("Please enter an email to send the verification code to.");
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
        const msg = (data && (data.message || data.error)) || "Failed to send code.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success(
        `Verification code sent to ${maskEmail(emailToUse)}. Check your inbox.`
      );

      // advance to enter-code step
      setStep("enter-code");
    } catch (err) {
      console.error("sendVerification error:", err);
      toast.error("Network error — could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code. This must use credentials: 'include' so the server can set a one-time cookie.
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
        // Important: include credentials so server Set-Cookie for one-time cookie is accepted
        credentials: "include",
        body: JSON.stringify({
          code: code.trim(),
          email: userEmail?.trim() || enteredEmail.trim(),
          currentPassword: currentPassword.trim(),
          action: verifyForAction, // optional, in case backend needs to know intended action
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || "Verification failed.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success("Verified successfully.");

      // advance depending on action
      if (verifyForAction === "update-contact") {
        setStep("update-email");
      } else {
        // change-password flow
        setStep("change-password");
      }
    } catch (err) {
      console.error("handleVerify error:", err);
      toast.error("Network error — could not verify code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 (update-contact): send updated email using the one-time cookie created above
  const handleUpdateContact = async () => {
    const emailToUpdate = updatedEmail.trim();
    if (!emailToUpdate) {
      toast.error("Please enter the updated email.");
      return;
    }

    // basic email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailToUpdate)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      // Use credentials: 'include' so the one-time cookie is sent along with this request
      const res = await fetch("/api/auth/update-contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: emailToUpdate }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || "Failed to update email.";
        toast.error(msg);
        setLoading(false);
        return;
      }

      toast.success("Contact email updated successfully.");
      setStep("complete");

      // notify parent that verification/update completed
      try {
        onVerify();
      } catch (e) {
        console.warn("onVerify callback error:", e);
      }
    } catch (err) {
      console.error("handleUpdateContact error:", err);
      toast.error("Network error — could not update contact email.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 alternative: change password
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
      // This route name may differ in your backend; adjust accordingly.
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
        const msg = (data && (data.message || data.error)) || "Failed to change password.";
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

        {step === "send-code" && (
          <>
            <p className="text-sm text-gray-800 mb-4">
              We will send a verification code to{" "}
              <strong>
                {userEmail
                  ? maskEmail(userEmail)
                  : enteredEmail
                  ? maskEmail(enteredEmail)
                  : "your email"}
              </strong>
              .
            </p>

            {/* ask for email if not provided by parent */}
            {!userEmail && (
              <input
                type="email"
                placeholder="Enter email to send code to"
                value={enteredEmail}
                onChange={(e) => setEnteredEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 mb-3 text-black"
                autoFocus
              />
            )}

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
                disabled={loading}
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
            <p className="text-sm text-gray-800 mb-3">
              Enter the new email to associate with your account.
            </p>
            <input
              type="email"
              placeholder="New email"
              value={updatedEmail}
              onChange={(e) => setUpdatedEmail(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3 text-black"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setStep("enter-code")}
                className="px-3 py-2 border rounded text-sm text-black"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleUpdateContact}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Email"}
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
                onClick={() => setStep("enter-code")}
                className="px-3 py-2 border rounded text-sm text-black"
              >
                Back
              </button>
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
            <p className="mb-4 text-gray-800">All set — action completed successfully.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  // reset states in parent if needed; modal will reset on hide
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, elRef.current);
}
