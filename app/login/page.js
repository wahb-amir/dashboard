'use client';
import { useState, forwardRef, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

// --- Icon SVGs (Inline Lucide-style icons for clean integration) ---
const EyeIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.06 14.86a12.63 12.63 0 0 1 20 0"></path>
        <path d="M12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"></path>
        <path d="M10 14h4"></path>
    </svg>
);

const EyeOffIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-6-10-6"></path>
        <path d="M2 2l20 20"></path>
        <path d="M6 14s2-6 8-6"></path>
        <path d="M14 14a3 3 0 1 1-6 0"></path>
    </svg>
);

/* Floating input component - Updated to accept rightIcon prop */
const FloatingInput = forwardRef(function FloatingInput(
    { id, label, type = "text", value, onChange, autoComplete, nextRef, onSubmitIfNoNext, disabled, rightIcon }, // <--- Added rightIcon
    ref
) {
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (nextRef && nextRef.current) nextRef.current.focus();
            else if (typeof onSubmitIfNoNext === "function") onSubmitIfNoNext();
        }
    };

    return (
        <div className="relative">
            <input
                id={id}
                ref={ref}
                type={type}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                onKeyDown={handleKeyDown}
                placeholder=" "
                disabled={disabled}
                className={`peer w-full bg-white/90 border border-gray-200 rounded-lg px-4 pt-5 pb-3 text-gray-800 text-sm shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-60
                    ${rightIcon ? 'pr-12' : ''}  // <--- Add extra padding-right for the icon
                `}
                aria-label={label}
            />

            {/* Icon Adornment wrapper */}
            {rightIcon && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pt-1">
                    {rightIcon}
                </div>
            )}

            <label
                htmlFor={id}
                className="absolute left-4 top-3 text-gray-500 text-sm pointer-events-none transform origin-left
                    transition-all duration-150
                    peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400
                    peer-focus:top-1 peer-focus:text-xs peer-focus:text-blue-600 peer-focus:font-semibold
                    peer-not-placeholder-shown:top-1 peer-not-placeholder-shown:text-xs peer-not-placeholder-shown:text-gray-600"
            >
                {label}
            </label>
        </div>
    );
});

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // --- State for Password Visibility (added as requested) ---
    const [showPassword, setShowPassword] = useState(false);
    const toggleShowPassword = () => setShowPassword(prev => !prev);
    const inputType = showPassword ? 'text' : 'password';
    // ---------------------------------------------------------

    // token state (no localStorage caching)
    const [appToken, setAppToken] = useState(null);
    const [tokenLoading, setTokenLoading] = useState(true);
    const [tokenError, setTokenError] = useState("");
    const [tokenRetries, setTokenRetries] = useState(0);

    // refs
    const nameRef = useRef(null);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const submitBtnRef = useRef(null);

    const onSubmitIfNoNext = () => {
        if (submitBtnRef.current) submitBtnRef.current.click();
    };

    // Abort / mounted ref
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        (async () => {
            try {
                const response = await axios.get('/api/auth/validAuthToken', {
                    withCredentials: true
                });
                if (response?.data?.ok === 1) {
                    router.push('/');
                }
            } catch (e) {
                // ignore - user is not authenticated
            }
        })();

        // Start fetching app token on mount
        fetchAppToken(0);

        return () => {
            isMounted.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const MAX_RETRIES = 3;

    async function fetchAppToken(retry = 0) {
        if (!isMounted.current) return;

        setTokenLoading(true);
        setTokenError("");
        if (retry === 0) toast.loading("Fetching app token...", { id: "fetch-token" });

        try {
            const res = await axios.get("/api/auth/app_token", {
                withCredentials: true,
                headers: { "Content-Type": "application/json" },
                timeout: 7000,
            });

            const token = res?.data?.token;
            if (!token) throw new Error("No token in response");

            if (!isMounted.current) return;
            setAppToken(token);
            setTokenLoading(false);
            setTokenError("");
            setTokenRetries(0);
            toast.dismiss("fetch-token");
            toast.success("App token acquired");
            console.log("Fetched app token:", token);
        } catch (err) {
            const nextRetry = retry + 1;
            setTokenRetries(nextRetry);

            if (nextRetry <= MAX_RETRIES && isMounted.current) {
                const backoff = 500 * Math.pow(2, retry);
                toast.dismiss("fetch-token");
                toast.loading(`Retrying... (${nextRetry}/${MAX_RETRIES})`, { id: "fetch-token" });
                await new Promise((r) => setTimeout(r, backoff));
                if (isMounted.current) await fetchAppToken(nextRetry);
                return;
            }

            if (isMounted.current) {
                setTokenLoading(false);
                setTokenError("Unable to fetch app token. Please check your internet and try again.");
                toast.dismiss("fetch-token");
                toast.error("Failed to fetch app token. Check connection.");
                console.error("App token fetch failed:", err);
            }
        }
    }

    /* submit */
    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (!appToken) {
                setError("App token missing. Please retry.");
                toast.error("App token missing. Please reload or try again.");
                setLoading(false);
                return;
            }

            if (isLogin) {
                const res = await axios.post(
                    "/api/auth/login",
                    { email, password, token: appToken },
                    {
                        withCredentials: true,
                        headers: { "Content-Type": "application/json" },
                        timeout: 10000,
                    }
                );

                toast.success(res?.data?.message || "Logged in.");
                router.push('/')
            } else {
                // register example
                const res = await axios.post(
                    "/api/auth/register",
                    { name, email, password, token: appToken },
                    {
                        withCredentials: true,
                        headers: { "Content-Type": "application/json" },
                        timeout: 10000,
                    }
                );

                toast.success(res?.data?.message || "Registered successfully.");
                // redirect as needed
                router.push("/")
            }
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || "Something went wrong. Try again.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const formShake = error ? { x: [0, -8, 8, -6, 4, 0] } : { x: 0 };

    const Dots = () => (
        <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="inline-block w-3 h-3 rounded-full bg-white/95"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                />
            ))}
        </div>
    );

    return (
        <>
            <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
            <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-gray-100 to-gray-50 relative">
                {/* Branding */}
                <motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="md:w-1/2 flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-10"
                >
                    <div className="mb-6 flex flex-col items-center">
                        <div className="relative w-28 h-28 mb-4 grid place-items-center">
                            <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600"
                                animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                aria-hidden
                            />
                            {/* Placeholder for the logo image */}
                            <div className="relative z-10 w-20 h-20 bg-white rounded-full grid place-items-center">

                                <Image src="/logo.svg" alt="Butt Network Logo" width={80} height={80} className="rounded-full" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-extrabold leading-tight text-white">Butt Network</h1>
                    </div>

                    <p className="text-center text-white/90 max-w-md text-lg leading-relaxed">
                        Secure client access to project status, live updates, and team notices — simple, modern, and private.
                    </p>

                    <div className="mt-8 w-full max-w-sm text-sm text-white/80">
                        <div className="flex items-center gap-3 py-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                            <span>Real-time progress updates</span>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
                            <span>Token-based secure access</span>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                            <span>Team notices & logs</span>
                        </div>
                    </div>
                </motion.div>

                {/* Form area */}
                <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="md:w-1/2 flex flex-col justify-center items-center p-8"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {tokenLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md flex flex-col items-center gap-6"
                            >
                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 grid place-items-center shadow-lg">
                                    <Dots />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-gray-800">Preparing secure connection</h3>
                                    <p className="text-sm text-gray-500 mt-2">We are fetching a secure token to load your project. Please wait…</p>
                                </div>
                            </motion.div>
                        ) : tokenError ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                            >
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Couldn&rsquo;t connect</h3>
                                <p className="text-sm text-gray-600 mb-4">{tokenError}</p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={async () => {
                                            setTokenError("");
                                            setTokenRetries(0);
                                            setTokenLoading(true);
                                            toast.loading("Retrying to fetch token...", { id: "manual-retry" });
                                            try {
                                                await fetchAppToken(0);
                                                toast.dismiss("manual-retry");
                                                toast.success("App token acquired");
                                            } catch (e) {
                                                setTokenLoading(false);
                                                setTokenError("Retry failed. Please check your internet connection.");
                                                toast.dismiss("manual-retry");
                                                toast.error("Retry failed. Check your connection.");
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
                                    >
                                        Try again
                                    </button>

                                    <button
                                        type="button"
                                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                                        onClick={() => {
                                            toast("You can retry anytime. Check connection and press Try again.");
                                        }}
                                    >
                                        Help / Troubleshoot
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.35 }}
                                className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md"
                                style={{ willChange: "transform, opacity" }}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{isLogin ? "Welcome back" : "Create account"}</h2>
                                    <div className="text-sm text-gray-500">{isLogin ? "Sign in to continue" : "Join Butt Network"}</div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {!isLogin && (
                                        <FloatingInput
                                            id="name"
                                            label="Full name"
                                            type="text"
                                            ref={nameRef}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            autoComplete="name"
                                            nextRef={emailRef}
                                            onSubmitIfNoNext={onSubmitIfNoNext}
                                            disabled={loading}
                                        />
                                    )}

                                    <FloatingInput
                                        id="email"
                                        label="Email address"
                                        type="email"
                                        ref={emailRef}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        nextRef={passwordRef}
                                        onSubmitIfNoNext={onSubmitIfNoNext}
                                        disabled={loading}
                                    />

                                    {/* The Password Input with the rightIcon prop */}
                                    <FloatingInput
                                        id="password"
                                        label="Password"
                                        type={inputType} // Use the derived inputType (text or password)
                                        ref={passwordRef}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete={isLogin ? "current-password" : "new-password"}
                                        onSubmitIfNoNext={onSubmitIfNoNext}
                                        disabled={loading}
                                        // Pass the button containing the icon and handler as a prop
                                        rightIcon={
                                            <button
                                                type="button"
                                                onClick={toggleShowPassword}
                                                className="text-gray-500 hover:text-blue-600 transition p-2"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                                            </button>
                                        }
                                    />

                                    {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

                                    <motion.button
                                        ref={submitBtnRef}
                                        whileHover={{ scale: loading ? 1 : 1.02 }}
                                        whileTap={{ scale: loading ? 1 : 0.98 }}
                                        type="submit"
                                        disabled={loading}
                                        className="w-full mt-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-70"
                                        aria-label={isLogin ? "Login" : "Register"}
                                    >
                                        {loading ? "Processing..." : isLogin ? "Login" : "Register"}
                                    </motion.button>
                                </form>

                                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                    <button
                                        onClick={() => {
                                            setIsLogin(!isLogin);
                                            setError("");
                                            setTimeout(() => {
                                                if (!isLogin) emailRef.current?.focus();
                                                else nameRef.current?.focus();
                                            }, 50);
                                        }}
                                        className="text-blue-600 font-medium hover:underline"
                                    >
                                        {isLogin ? "Create an account" : "Have an account? Login"}
                                    </button>

                                    <button
                                        type="button"
                                        className="text-gray-400 hover:text-gray-600"
                                        onClick={() => {
                                            setEmail("client@example.com");
                                            setPassword("password123");
                                            setName("Demo Client");
                                            toast("Demo values filled");
                                        }}
                                    >
                                        Quick demo
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </>
    );
}