'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Clock, Zap, User, CheckCircle, Hourglass, XCircle, ArrowRight
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import toast, { Toaster } from 'react-hot-toast';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, when: "beforeChildren" } },
};
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// --- SKELETON LOADER COMPONENT ---
const SkeletonLoader = () => (
    <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-48 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-8 w-14 bg-gray-200 rounded"></div>
            </div>
        ))}
    </div>
);

// --- PROJECT TIMELINE COMPONENT ---
const ProjectTimeline = ({ project }) => {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'In Progress': return <Hourglass className="w-5 h-5 text-amber-500 animate-pulse" />;
            case 'Pending':
            case 'Quote Requested':
                return <Clock className="w-5 h-5 text-gray-400" />;
            default: return <XCircle className="w-5 h-5 text-red-500" />;
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'text-green-500 border-green-500';
            case 'In Progress': return 'text-amber-500 border-amber-500';
            case 'Pending':
            case 'Quote Requested':
                return 'text-gray-400 border-gray-400';
            default: return 'text-red-500 border-red-500';
        }
    };

    const timeline = Array.isArray(project?.timeline) && project.timeline.length > 0 ? project.timeline : [
        { step: "Project Details Missing", date: 'N/A', status: "Error", notes: "Timeline data not available." }
    ];

    return (
        <motion.div className="mt-6 bg-white p-6 rounded-xl shadow-lg" variants={containerVariants} initial="hidden" animate="visible">
            <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-3 border-gray-200">Project Timeline: {project?.name || 'Untitled'}</h3>
            <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                {timeline.map((item, idx) => (
                    <motion.div key={idx} className="mb-6 flex items-start relative" variants={itemVariants}>
                        <div className={`absolute -left-3 mt-1.5 w-8 h-8 flex items-center justify-center rounded-full bg-white border-4 ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-grow ml-6">
                            <p className={`text-xs font-semibold uppercase tracking-wider ${getStatusColor(item.status)}`}>{item.status}</p>
                            <h4 className="text-lg font-semibold text-gray-900 mt-1">{item.step}</h4>
                            <p className="text-sm text-gray-500 mt-0.5">Date: {item.date}</p>
                            {item.updatedBy && (
                                <p className="text-sm text-gray-600 mt-0.5 italic">
                                    Updated by: <span className="font-medium">{item.updatedBy}</span>
                                </p>
                            )}
                            {item.notes && <p className="text-sm text-gray-700 mt-2 border-l-4 border-blue-400 pl-3 py-1 bg-blue-50 rounded-r-lg">{item.notes}</p>}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export default function ProjectDashboard({ setIsQuoteModalOpen, projectCount }) {
    // state
    const [projects, setProjects] = useState({}); // keyed by id
    const [isLoading, setIsLoading] = useState(true);
    const [projectID, setProjectID] = useState('');
    const [currentProject, setCurrentProject] = useState(null);
    const [error, setError] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [isCancleModalOpen, setIsCancleModalOpen] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState(null);

    // removed add-step states: handled by dev team

    const [isCancelling, setIsCancelling] = useState(false);

    // Editable statuses (used elsewhere; keep for compatibility)
    const editableStatuses = ['Quote Requested', 'Pending', 'In Progress'];

    // Helper: determine whether a project may be cancelled by the user.
    // Cancel is allowed while the request is still pre-confirmation (quote/pending/awaiting review).
    // Disallowed once project becomes confirmed/accepted/in-progress/completed/cancelled.
    const canCancel = (status) => {
        if (!status) return true;
        const s = String(status).toLowerCase();
        // statuses that block cancellation (these should match your backend conventions)
        const blocked = ['confirmed', 'accepted', 'in progress', 'in-progress', 'completed', 'cancelled', 'active'];
        for (const b of blocked) if (s.includes(b)) return false;
        // allow cancel for common pre-review statuses
        return true;
    };

    // fetchProjects: tolerant parsing (handles array OR { projects: [...] })
    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/project');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = await response.json();

            const projectsArray = Array.isArray(json) ? json : (Array.isArray(json?.projects) ? json.projects : []);

            // inside fetchProjects(), replace the body that builds `newProjects`
            const newProjects = {};
            projectsArray.forEach((q, idx) => {
                const id = (q._id || q.id || `PROJ-NEW-${Date.now()}-${idx}`).toString();
                const name = q.title || q.projectTitle || q.name || `Quote Request (${id.slice(-6)})`;
                const status = q.status || "Quote Requested";
                const createdAt = q.createdAt || q.created_at || q.created || q.date || Date.now();

                // NORMALIZE developers:
                let developers = [];
                if (Array.isArray(q.developers) && q.developers.length) {
                    developers = q.developers;
                } else if (Array.isArray(q.data?.developers) && q.data.developers.length) {
                    developers = q.data.developers;
                } else if (q.developer) {
                    developers = [q.developer];
                } else if (q.data?.developer) {
                    developers = [q.data.developer];
                }
                // ensure safe shape: map strings to objects if backend sends simple names
                developers = developers.map((d) => {
                    if (!d) return null;
                    if (typeof d === 'string') return { name: d, portfolio: '#' };
                    if (typeof d === 'object') return d;
                    return null;
                }).filter(Boolean);

                newProjects[id] = {
                    id,
                    name,
                    status,
                    currentLead: developers.length ? developers.map(d => d.name).join(', ') : (q.assignedTo || `Awaiting Review`),
                    currentTask: q.currentTask || `New quote request received. ${q.details ? q.details.slice(0, 120) + '...' : ''}`,
                    lastUpdate: q.updatedAt ? new Date(q.updatedAt).toLocaleString() : new Date(createdAt).toLocaleString(),
                    timeline: q.steps || [
                        { step: "Quote Requested", date: new Date(createdAt).toLocaleString(), status: "Quote Requested", notes: `Request submitted by ${q.name || q.contactName || 'unknown'}.` },
                        { step: "Initial Scoping & Review", date: 'TBD', status: "Pending", notes: "Awaiting assignment to a Project Manager." }
                    ],
                    developers,
                    data: q
                };
            });


            setProjects(newProjects);

            const keys = Object.keys(newProjects);
            if (keys.length > 0) {
                setCurrentProject(newProjects[keys[0]]);

            } else {
                setCurrentProject(null);
            }
        } catch (e) {
            console.error("Failed to fetch projects:", e);
            setError("Failed to load project data. Please check the API endpoint.");
            setProjects({});
            setCurrentProject(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // handle adding a new project (from quote modal or API) - unchanged
    const handleSetNewProject = useCallback((newProjectData) => {
        const id = (newProjectData._id || newProjectData.id || `PROJ-NEW-${Date.now()}`).toString();
        const name = newProjectData.title || newProjectData.name || 'Untitled Project';
        const requesterName = newProjectData.name || newProjectData.contactName || newProjectData.userName || 'Unknown';
        const status = newProjectData.status || 'Quote Requested';

        const transformed = {
            id,
            name,
            status,
            currentLead: `Lead TBD (Request by ${requesterName})`,
            currentTask: `Awaiting initial review. ${newProjectData.details ? newProjectData.details.slice(0, 100) + '...' : 'No details provided.'}`,
            lastUpdate: 'Just now',
            timeline: [
                {
                    step: "Project Created",
                    date: new Date().toLocaleString(),
                    status: "Quote Requested",
                    notes: `Request submitted by ${requesterName}.`
                },
            ],
            developers: [], // initialize empty array if none assigned yet
            data: newProjectData
        };

        setProjects(prev => ({ [transformed.id]: transformed, ...prev }));
        setCurrentProject(transformed);
    }, []);


    // Expose create alias (keeps your original API)
    const handleCreateProject = handleSetNewProject;

    // improved search: match by exact id OR by partial name (case-insensitive)
    const handleSearch = () => {
        setError('');
        if (!projectID || !projectID.trim()) {
            setError('Please enter a project ID or name.');
            return;
        }
        const q = projectID.trim().toLowerCase();
        setIsSearching(true);

        setTimeout(() => {
            const byId = projects[projectID] || projects[projectID.trim()] || null;
            const projectList = Object.values(projects);
            const byFuzzy = projectList.find(p => p.id.toLowerCase() === q || p.name.toLowerCase().includes(q));

            const found = byId || byFuzzy || null;
            if (found) {
                setCurrentProject(found);
                setError('');
            } else {
                setError(`Project "${projectID}" not found. Try an ID or part of the project name.`);
            }
            setIsSearching(false);
        }, 450);
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

    // list for UI
    const projectList = Object.values(projects);

    useEffect(() => {
        if (typeof projectCount === 'function') {
            projectCount(projectList.length);
        }
    }, [projectList.length, projectCount]);

    // attemptCancelBackend: returns the parsed json from the server (or throws)
    const attemptCancelBackend = async (projectId) => {
        try {
            const res = await fetch(
                `/api/project/cancel/?projectId=${encodeURIComponent(projectId)}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin', // ensure cookies (auth) are sent
                    body: JSON.stringify({ status: 'Cancelled' }),
                }
            );

            const json = await res.json();

            if (!res.ok) {
                // include server message when available
                throw new Error(json?.message || `Server returned ${res.status}`);
            }

            // return the parsed JSON so caller can check json.ok / json.message
            return json;
        } catch (err) {
            console.warn('Failed to cancel project on backend:', err);
            return null;
        }
    };

    // handleCancelProject: uses attemptCancelBackend and checks json.ok
    const handleCancelProject = async (projectId) => {
        if (!projectId) {
            toast.error('No project selected for cancellation.');
            return;
        }

        const projectToCancel = projects[projectId];
        if (!projectToCancel) {
            toast.error('Project not found.');
            return;
        }

        // guard: use canCancel to decide if cancellation is allowed
        if (!canCancel(projectToCancel.status)) {
            toast.error('Cancellations are only allowed before confirmation. Please contact dev.buttnetworks@gmail.com for help.');
            return;
        }

        setIsCancelling(true);
        setError('');

        // optimistic update
        const previous = projectToCancel;
        const cancelled = {
            ...projectToCancel,
            status: 'Cancelled',
            lastUpdate: new Date().toLocaleString(),
            timeline: [
                ...(projectToCancel.timeline || []),
                { step: 'Project Cancelled', date: new Date().toLocaleString(), status: 'Cancelled', notes: 'Cancelled by user' }
            ]
        };
        setProjects(prev => ({ ...prev, [projectId]: cancelled }));
        setCurrentProject(cancelled);

        try {
            const json = await attemptCancelBackend(projectId);

            // backend returned a successful JSON (e.g. { ok: 1, message: "Project cancelled" })
            if (json && (json.ok === 1 || json.ok === true)) {
                toast.success(json.message || 'Project cancelled successfully.');
                await fetchProjects(); // re-sync canonical state
            } else if (json && (json.ok === 0 || json.ok === false)) {
                // server responded but said it couldn't cancel (but returned 200)
                setProjects(prev => ({ ...prev, [previous.id]: previous }));
                setCurrentProject(previous);
                toast.error(json.message || 'Could not cancel the project on the server. Please contact dev.buttnetworks@gmail.com');
            } else {
                // null or unknown response
                setProjects(prev => ({ ...prev, [previous.id]: previous }));
                setCurrentProject(previous);
                toast.error('Could not cancel the project on the server. Please contact dev.buttnetworks@gmail.com');
            }
        } catch (err) {
            console.error('Error during cancel flow:', err);
            setProjects(prev => ({ ...prev, [previous.id]: previous }));
            setCurrentProject(previous);
            toast.error('Cancel failed. Please contact dev.buttnetworks@gmail.com');
        } finally {
            setIsCancelling(false);
            setIsCancleModalOpen(false);
            setCancelTargetId(null);
        }
    };


    const handleConfirmCancel = async () => {
        if (!cancelTargetId) {
            toast.error('No project selected.');
            setIsCancleModalOpen(false);
            return;
        }
        await handleCancelProject(cancelTargetId);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <Toaster position='top-right' />
            {/* Top Action Panel */}
            <motion.div className="flex flex-col sm:flex-row justify-between items-center bg-blue-600 text-white p-5 rounded-xl shadow-xl" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="mb-3 sm:mb-0">
                    <h2 className="text-lg font-bold">Need an estimate or scoping?</h2>
                    <p className="text-blue-100 text-sm">Submit a quick request and we’ll spin up a mock project for now.</p>
                </div>
                <button
                    onClick={() => typeof setIsQuoteModalOpen === 'function' && setIsQuoteModalOpen({
                        isOpen: true,
                        setProject: handleSetNewProject
                    })}
                    className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold py-2 px-4 rounded-full shadow hover:bg-gray-100"
                    aria-label="Request quote"
                >
                    <Zap className="w-4 h-4" /> Request Quote
                </button>
            </motion.div>

            {/* Search + projects list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* left: search + list */}
                <div className="col-span-1 lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-xl shadow">
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">Project Lookup</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={projectID}
                                onChange={(e) => setProjectID(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="PROJ-ID-123456 or project name"
                                className="flex-1 rounded-lg border border-gray-600 text-gray-500 p-3"
                                aria-label="Project ID or name"
                            />
                            <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 bg-blue-600 text-white rounded-lg" aria-label="Search project">
                                {isSearching ? <span className="inline-flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Searching</span> : <span className="inline-flex items-center gap-2"><Search className="w-4 h-4" /> Search</span>}
                            </button>
                        </div>
                        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">My Quotes/Projects ({projectList.length})</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {isLoading ? (
                                <SkeletonLoader />
                            ) : projectList.length > 0 ? (
                                projectList.map((p) => (
                                    <div
                                        key={p.id}
                                        className={`flex items-start justify-between gap-3 p-3 rounded-lg border hover:shadow cursor-pointer ${currentProject?.id === p.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200'}`}
                                        onClick={() => setCurrentProject(p)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && setCurrentProject(p)}
                                    >
                                        <div>
                                            <p className="text-sm text-gray-500">{p.id}</p>
                                            <p className="font-medium text-gray-900">{p.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{p.status} • {p.lastUpdate}</p>
                                        </div>
                                        <div className="text-right flex items-center gap-2">
                                            {currentProject?.id === p.id && <span className="text-blue-600 text-xs font-semibold">ACTIVE</span>}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setCurrentProject(p); }}
                                                className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-200 active:bg-blue-300 transition-all ease-in duration-150"
                                                aria-label={`View ${p.name}`}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">No quotes or projects found. Request a quote to get started!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* right: main snapshot / empty welcome */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="bg-white p-8 rounded-xl shadow">
                                    <div className="h-6 bg-gray-300 rounded w-1/2 mb-6"></div>
                                    <div className="grid grid-cols-3 gap-6 mb-6">
                                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                                        <div className="h-20 bg-gray-100 rounded-xl"></div>
                                    </div>
                                    <div className="h-16 bg-gray-100 rounded-xl mb-6"></div>
                                    <div className="h-40 bg-gray-100 rounded-xl"></div>
                                </div>
                            </motion.div>
                        ) : currentProject ? (
                            <motion.div key={currentProject.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
                                <div className="flex items-start justify-between">
                                    <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Project Snapshot: {currentProject.name}</h2>
                                    {/* Buttons: Cancel Project */}
                                    <div className="flex items-center gap-3">
                                        {canCancel(currentProject?.status) ? (
                                            <>
                                                <ConfirmModal
                                                    open={isCancleModalOpen}
                                                    onClose={() => { setIsCancleModalOpen(false); setCancelTargetId(null); }}
                                                    onConfirm={handleConfirmCancel}
                                                    title="Confirm Cancel"
                                                    description="Are you sure you want to cancel this project? This action cannot be undone."
                                                    text="Cancel Project"
                                                />

                                                <button
                                                    onClick={() => { setCancelTargetId(currentProject.id); setIsCancleModalOpen(true); }}
                                                    disabled={isCancelling}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-md border border-red-200 hover:bg-red-100 disabled:opacity-50"
                                                >
                                                    {isCancelling ? 'Cancelling...' : 'Cancel Project'}
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-600">
                                                Cancellation locked — this project is already confirmed or in progress. Please contact <a className="text-blue-600 underline" href="mailto:dev.buttnetworks@gmail.com">dev.buttnetworks@gmail.com</a> to request changes.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="p-4 bg-white rounded-xl shadow border-t-4 border-blue-500">
                                        <p className="text-sm text-gray-500">Current Status</p>
                                        <p className="text-xl font-bold text-blue-600 mt-1 flex items-center"><ArrowRight className="w-5 h-5 mr-2" /> {currentProject.status}</p>
                                    </div>

                                    {/* developers column */}
                                    {/* Developers Column */}
                                    <div>
                                        {Array.isArray(currentProject?.developers) && currentProject.developers.length > 0 ? (
                                            <div className="p-4 bg-white rounded-xl shadow border-t-4 border-green-500">
                                                <p className="text-sm text-gray-500 mb-3">Working On It</p>

                                                {currentProject.developers.map((dev, index) => {
                                                    const key = dev._id || dev.id || dev.name || index;
                                                    const href = dev.portfolio || dev.url || dev.profile || "#";
                                                    const displayName =
                                                        dev.name ||
                                                        dev.fullName ||
                                                        dev.handle ||
                                                        (href !== "#" ? href : `Developer ${index + 1}`);

                                                    return (
                                                        <a
                                                            key={key}
                                                            href={href}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center mb-2 last:mb-0 hover:opacity-90"
                                                        >
                                                            <User className="w-5 h-5 mr-2 text-green-500" />
                                                            <span className="font-semibold text-gray-900">
                                                                {displayName}{" "}
                                                                {href !== "#" && (
                                                                    <sup className="text-blue-800 text-sm ml-2">Portfolio</sup>
                                                                )}
                                                            </span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-white rounded-xl shadow border-t-4 border-yellow-400">
                                                <p className="text-sm text-gray-500">No developers assigned</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Last Activity */}
                                    <div className="p-4 bg-white rounded-xl shadow border-t-4 border-gray-300 mt-4">
                                        <p className="text-sm text-gray-500">Last Activity</p>
                                        <p className="text-lg font-bold text-gray-900 mt-1 flex items-center">
                                            <Clock className="w-5 h-5 mr-2 text-gray-500" /> {currentProject.lastUpdate || "N/A"}
                                        </p>
                                    </div>


                                </div>

                                <div className="p-4 rounded-xl mb-4 bg-blue-50">
                                    <p className="font-semibold text-blue-700">Current Focus</p>
                                    <p className="text-gray-900 mt-1">{currentProject.currentTask}</p>
                                </div>


                                <ProjectTimeline project={currentProject} />
                            </motion.div>
                        ) : (
                            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <div className="bg-white p-8 rounded-xl shadow text-center">
                                    <Search className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-gray-900">Track Your Project Instantly</h3>
                                    <p className="text-gray-500 mt-1">Search a Project ID or request a new quote to get started.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
