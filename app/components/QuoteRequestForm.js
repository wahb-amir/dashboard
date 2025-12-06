'use client';
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle, Clock, Zap } from "lucide-react";
import 'react-phone-input-2/lib/style.css';
import PhoneInput from 'react-phone-input-2';
const modalVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } },
    exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18 } },
};

const initialForm = {
    projectTitle: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    deadline: "",
    details: "",
    contactMethod: "email",
    files: [],
};

function todayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function QuoteRequestForm({ onClose = () => { }, onCreateProject = () => { }, setProject }) {
    const [form, setForm] = useState(initialForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [charCount, setCharCount] = useState(0);
    const [errors, setErrors] = useState({});
    const maxDetails = 1200;

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => (document.body.style.overflow = prev);
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleRemoveFile = (idx) => {
        setForm((p) => {
            const files = [...p.files];
            files.splice(idx, 1);
            return { ...p, files };
        });
    };

    const validate = () => {
        const e = {};
        if (!form.projectTitle.trim()) e.projectTitle = "Project title required";
        if (!form.email.trim()) e.email = "Email required";
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";
        if (!form.details.trim()) e.details = "Please provide project details";

        // Deadline validation: required, not past, at least 1.5 days (36 hours) from now
        if (!form.deadline) {
            e.deadline = "Deadline is required";
        } else {
            const parts = form.deadline.split("-");
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            const d = Number(parts[2]);
            if (!y || !m || !d) {
                e.deadline = "Invalid deadline date";
            } else {
                // Interpret deadline as the end of selected day in local time
                const deadlineDate = new Date(y, m - 1, d, 23, 59, 59, 999);
                const now = new Date();

                if (deadlineDate.getTime() < now.getTime()) {
                    e.deadline = "Deadline cannot be in the past";
                } else {
                    const minMs = 36 * 60 * 60 * 1000; // 36 hours
                    if (deadlineDate.getTime() - now.getTime() < minMs) {
                        e.deadline = "Deadline must be at least 1.5 days (36 hours) from now";
                    }
                }
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        if (!validate()) return;
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            for (const key in form) {
                if (key === "files") {
                    form.files.forEach((file) => formData.append("attachment", file));
                } else {
                    formData.append(key, form[key]);
                }
            }

            const res = await fetch("/api/quote", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok || data.ok === false) {
                throw new Error(data.message || data.error || "Failed to send quote request");
            }

            setSuccess(true);

            if (data.project && setProject) {
                setProject(data.project);
            }

            setForm(initialForm);
            setCharCount(0);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Submit error:", err);
            alert(`Failed to send quote: ${err.message}. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={onClose}
        >
            <div className="absolute inset-0 bg-transparent backdrop-blur-sm" aria-hidden="true" />
            <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onMouseDown={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-2xl mx-auto rounded-xl shadow-xl bg-white ring-1 ring-slate-100 overflow-hidden"
                style={{ maxHeight: "88vh", display: "flex", flexDirection: "column" }}
            >
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg sm:text-2xl font-bold text-sky-700">Request a New Quote</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {success ? (
                        <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="text-lg font-semibold text-slate-800">Request submitted!</p>
                            <p className="text-sm text-slate-600 mt-1">The new project has been added to your dashboard.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Title *</label>
                                    <input
                                        type="text"
                                        value={form.projectTitle}
                                        onChange={(e) => setForm((p) => ({ ...p, projectTitle: e.target.value }))}
                                        placeholder="e.g., Mobile app for on-demand services"
                                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-900"
                                        required
                                    />
                                    {errors.projectTitle && <p className="text-sm text-red-600 mt-1">{errors.projectTitle}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={form.company}
                                        onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                                        placeholder="Optional"
                                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                                    <input
                                        type="text"
                                        value={form.contactName}
                                        onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                                        placeholder="Full name"
                                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                        placeholder="you@company.com"
                                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-900"
                                        required
                                    />
                                    {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Phone *
                                    </label>

                                    <PhoneInput
                                        country={'us'}
                                        value={form.phone}
                                        onChange={(phone) => setForm((prev) => ({ ...prev, phone }))}
                                        containerClass="w-full"
                                        inputClass="w-full rounded-lg border border-slate-300 p-3 pl-16 shadow-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-200 focus:outline-none"
                                        buttonClass="rounded-l-lg border border-slate-300"
                                        dropdownClass="rounded-lg shadow-lg"
                                        specialLabel=""
                                        inputProps={{
                                            required: true,
                                            autoFocus: false,
                                        }}
                                        dropdownStyle={{
                                            color: '#1e293b', // text-slate-800
                                            backgroundColor: '#f8fafc', // bg-slate-50
                                        }}
                                    />
                                    {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project Details *</label>
                                <textarea
                                    value={form.details}
                                    onChange={(e) => { setForm((p) => ({ ...p, details: e.target.value })); setCharCount(e.target.value.length); }}
                                    rows={5}
                                    maxLength={maxDetails}
                                    className="mt-1 block w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-900"
                                    placeholder="Describe scope, goals, required features ..."
                                    required
                                />
                                <div className="flex justify-end mt-1">
                                    <p className="text-xs text-slate-500">{charCount}/{maxDetails}</p>
                                </div>
                                {errors.details && <p className="text-sm text-red-600 mt-1">{errors.details}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Attach Files</label>
                                    <input type="file" onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        setForm((p) => ({ ...p, files: [...p.files, ...files] }));
                                    }} multiple className="mt-1 block w-full text-sm text-slate-700 pointer-cursor" />
                                    {form.files.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {form.files.map((f, i) => (
                                                <li key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-md p-2 border">
                                                    <span className="truncate mr-3 text-slate-800">{f.name}</span>
                                                    <button type="button" onClick={() => handleRemoveFile(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Deadline *</label>
                                    <input
                                        type="date"
                                        value={form.deadline}
                                        min={todayDateString()}
                                        onChange={(e) => {
                                            setForm((p) => ({ ...p, deadline: e.target.value }));
                                            setErrors(prev => {
                                                const n = { ...prev };
                                                delete n.deadline;
                                                return n;
                                            });
                                        }}
                                        className="mt-1 block w-full rounded-lg border border-slate-300 p-3 shadow-sm focus:ring-2 focus:ring-sky-200 text-slate-900"
                                        required
                                    />
                                    {errors.deadline && <p className="text-sm text-red-600 mt-1">{errors.deadline}</p>}
                                </div>
                            </div>

                            <div className="flex gap-3 flex-col sm:flex-row justify-end mt-2">
                                <motion.button
                                    type="button"
                                    onClick={onClose}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto px-5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </motion.button>

                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 flex items-center justify-center"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Clock className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 mr-2" /> Send Request
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
