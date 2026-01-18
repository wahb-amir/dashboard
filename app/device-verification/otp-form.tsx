"use client";

import { useEffect, useRef, useState, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

interface OtpFormProps {
  email: string;
}

export default function OtpForm({ email }: OtpFormProps) {
  const router = useRouter();
  const length = 6;
  const CLIENT_DEFAULT_COOLDOWN = 120; // fallback if server doesn't provide retryAfter

  // State
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [resendRemaining, setResendRemaining] = useState<number>(0); // start at 0, use server value when available
  const [resendLoading, setResendLoading] = useState(false);

  // Success State
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Refs
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submitTriggered = useRef(false); // Guard against double submission
  const redirectPath = useRef("/dashboard");
  const sendOnMountCalled = useRef(false); // Prevent double send in Strict Mode/dev

  const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, "$1****$3");

  // 1. Timer for Resend Button
  useEffect(() => {
    const t = setInterval(() => {
      setResendRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 2. Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // 3. Auto-Submit when filled
  useEffect(() => {
    const isComplete = otp.every((char) => char !== "");

    // Only submit if complete, not loading, not verified, and hasn't triggered yet
    if (isComplete && !loading && !verified && !submitTriggered.current) {
      submitOtp(otp.join(""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // 4. Redirect Countdown after success
  useEffect(() => {
    if (!verified) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(redirectPath.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verified, router]);

  // Helper to handle server response for send/resend
  const handleSendResponse = (data: any) => {
    // server may return:
    // { sent: true, retryAfter: <seconds> } or
    // { sent: false, reason: 'resend_cooldown', retryAfter: <seconds> }
    const retryAfter = typeof data?.retryAfter === "number" ? Math.max(0, Math.floor(data.retryAfter)) : undefined;

    if (data?.sent === true) {
      setMsg({ type: "info", text: "Verification code sent." });
      setResendRemaining(retryAfter ?? CLIENT_DEFAULT_COOLDOWN);
    } else if (data?.sent === false) {
      if (data?.reason === "resend_cooldown" && typeof retryAfter === "number") {
        setMsg({ type: "info", text: `Please wait ${retryAfter}s before resending.` });
        setResendRemaining(retryAfter);
      } else if (data?.reason === "already_sent") {
        setMsg({ type: "info", text: "A code was already sent for this session." });
        setResendRemaining(retryAfter ?? CLIENT_DEFAULT_COOLDOWN);
      } else {
        setMsg({ type: "error", text: data?.error || "Failed to send code." });
      }
    } else {
      setMsg({ type: "error", text: data?.error || "Failed to send code." });
    }
  };

  // 5. Send code on mount (calls GET /api/auth/2fa/send-otp)
  useEffect(() => {
    if (sendOnMountCalled.current) return; // guard for Strict Mode/dev double mount
    sendOnMountCalled.current = true;

    const send = async () => {
      setMsg({ type: "info", text: "Sending verification code…" });
      try {
        const res = await fetch("/api/auth/2fa/send-otp", {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          handleSendResponse(data);
        } else {
          setMsg({ type: "error", text: data?.error || "Failed to send code." });
        }
      } catch (err) {
        console.error("send-code error:", err);
        setMsg({ type: "error", text: "Network error while sending code." });
      }
    };

    // fire-and-forget on mount
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- HANDLERS ---

  const submitOtp = async (code: string) => {
    submitTriggered.current = true; // Lock
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code, email }), // Send email back for verification context
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setVerified(true);
        redirectPath.current = data?.redirect || "/dashboard";
        setMsg({ type: "info", text: "Verified successfully!" });
      } else {
        throw new Error(data?.message || "Invalid code");
      }
    } catch (error: any) {
      setMsg({ type: "error", text: error.message || "Verification failed." });
      setOtp(Array(length).fill("")); // Reset inputs
      inputRefs.current[0]?.focus();
      submitTriggered.current = false; // Unlock
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>, idx: number) => {
    const value = e.target.value;
    // Allow only numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Take the last character entered (handles mobile autocomplete sometimes sending multiple chars)
    newOtp[idx] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (!otp[idx] && idx > 0) {
        // If current is empty, move back and delete previous
        const newOtp = [...otp];
        newOtp[idx - 1] = "";
        setOtp(newOtp);
        inputRefs.current[idx - 1]?.focus();
      } else {
        // Just delete current
        const newOtp = [...otp];
        newOtp[idx] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);

    if (!pastedData) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, index) => {
      if (index < length) newOtp[index] = char;
    });

    setOtp(newOtp);

    // Focus either the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex((val) => val === "");
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleResend = async () => {
    if (resendRemaining > 0) return;
    setMsg(null);
    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/send-otp", { method: "GET", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        handleSendResponse(data);
      } else {
        setMsg({ type: "error", text: data?.error || "Failed to resend." });
      }
    } catch (err) {
      console.error("resend error:", err);
      setMsg({ type: "error", text: "Network error." });
    } finally {
      setResendLoading(false);
    }
  };

  // --- RENDER ---

  return (
    <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full text-gray-900 border border-gray-100">
      <h1 className="text-xl font-semibold mb-2 text-red-600 text-center">Suspicious Login Attempt</h1>
      <p className="text-sm text-gray-600 mb-6 text-center">
        We've detected a login from a new device. A {length}-digit verification code was sent to{" "}
        <span className="text-teal-600 font-medium">{maskedEmail}</span>.
      </p>

      {/* INPUTS */}
      <div className="flex justify-center gap-2 sm:gap-3 mb-6">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInput(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            disabled={loading || verified}
            className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold rounded-lg border focus:outline-none focus:ring-2 transition-all 
              ${verified
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-300 focus:border-teal-500 focus:ring-teal-100 bg-white"
              }
              ${msg?.type === "error" && !verified ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100" : ""}
            `}
          />
        ))}
      </div>

      {/* STATUS MESSAGE */}
      {msg && (
        <div className={`text-center text-sm mb-4 font-medium ${msg.type === "error" ? "text-red-500" : "text-teal-600"}`}>
          {msg.text}
        </div>
      )}

      {/* SUCCESS UI */}
      {verified ? (
        <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-teal-700 font-bold text-lg">Verified!</h2>
          <p className="text-gray-400 text-sm mb-4">Redirecting in {countdown}s...</p>
          <button
            onClick={() => router.push(redirectPath.current)}
            className="w-full bg-teal-600 text-white py-2.5 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        /* ACTION BUTTONS */
        <div className="space-y-4">
          <button
            onClick={() => submitOtp(otp.join(""))}
            disabled={loading || otp.includes("")}
            className="w-full bg-teal-600 text-white font-semibold py-2.5 rounded-lg hover:bg-teal-700 focus:ring-4 focus:ring-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            )}
            {loading ? "Verifying..." : "Verify Device"}
          </button>

          <div className="text-center text-sm">
            <p className="text-gray-500">
              Didn't receive code?{" "}
              <button
                onClick={handleResend}
                disabled={resendRemaining > 0 || resendLoading}
                className="font-medium text-teal-600 hover:text-teal-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {resendLoading ? "Sending…" : resendRemaining > 0 ? `Resend in ${resendRemaining}s` : "Resend"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
