// src/components/ProjectTimelineInteractive.jsx
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle, Hourglass, XCircle, Clock } from 'lucide-react';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06, when: 'beforeChildren' } } };
const itemVariants = { hidden: { y: 12, opacity: 0 }, visible: { y: 0, opacity: 1 } };

const getStatusIcon = (status) => {
    switch (status) {
        case 'Completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
        case 'In Progress': return <Hourglass className="w-5 h-5 text-amber-600 animate-pulse" />;
        case 'Pending':
        case 'Quote Requested':
            return <Clock className="w-5 h-5 text-gray-500" />;
        case 'Cancelled':
            return <XCircle className="w-5 h-5 text-red-600" />;
        default: return <XCircle className="w-5 h-5 text-red-600" />;
    }
};

export default function ProjectTimelineInteractive({ project }) {
    const [expandedCount, setExpandedCount] = useState(4);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [compact, setCompact] = useState(false);

    const timeline = Array.isArray(project?.timeline) ? project.timeline.slice().sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

    const visible = timeline.slice(0, expandedCount);
    const moreCount = Math.max(0, timeline.length - visible.length);

    return (
        <motion.div className="mt-6 bg-white p-6 rounded-xl shadow-lg ring-1 ring-black/5" variants={containerVariants} initial="hidden" animate="visible">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Timeline — {project?.name || 'Untitled'}</h3>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-700">Events</div>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setCompact(prev => !prev)} className="px-3 py-2 bg-white border rounded flex items-center gap-2 text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-200">
                    {compact ? <><ChevronUp className="w-4 h-4" /> Compact</> : <><ChevronDown className="w-4 h-4" /> Expanded</>}
                </button>
                <div className="text-sm text-gray-500">Showing {visible.length} of {timeline.length} events</div>
            </div>

            <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-sky-100" />

                {visible.length === 0 && (
                    <div className="p-6 text-center text-gray-600 bg-gray-50 rounded">No timeline events available.</div>
                )}

                {visible.map((item, idx) => (
                    <motion.div key={idx} className={`mb-6 flex items-start relative ${compact ? 'py-2' : 'py-4'}`} variants={itemVariants}>
                        <div className={`absolute -left-3 mt-1.5 w-8 h-8 flex items-center justify-center rounded-full border-4 bg-gray-50`}>
                            {getStatusIcon(item.status)}
                        </div>

                        <div className={`flex-grow ml-6 cursor-pointer ${compact ? '' : 'transition hover:scale-[1.01] hover:shadow-lg'}`} onClick={() => setSelectedEvent(item)} onKeyDown={(e) => e.key === 'Enter' && setSelectedEvent(item)} tabIndex={0} role="button">
                            <p className={`text-xs font-semibold uppercase tracking-wider text-gray-700`}>{item.status}</p>
                            <div className="flex items-center justify-between gap-4">
                                <h4 className={`text-lg font-semibold text-gray-900 mt-1 ${compact ? 'text-base' : ''}`}>{item.step}</h4>
                                <p className="text-sm text-gray-600 whitespace-nowrap">{item.date}</p>
                            </div>

                            {item.notes && <p className="text-sm text-gray-800 mt-2 border-l-4 border-sky-300 pl-3 py-1 bg-sky-50 rounded-r-lg">{item.notes}</p>}
                        </div>
                    </motion.div>
                ))}

                {moreCount > 0 && (
                    <div className="text-center mt-2">
                        <button onClick={() => setExpandedCount(prev => prev + 6)} className="px-4 py-2 rounded bg-white border text-gray-800 hover:bg-gray-50">Show {moreCount} more</button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedEvent && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedEvent(null)} />
                            <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 ring-1 ring-black/5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedEvent.step}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{selectedEvent.date} • <span className="font-medium">{selectedEvent.status}</span></p>
                                    </div>
                                    <button onClick={() => setSelectedEvent(null)} aria-label="Close" className="text-gray-600 hover:text-gray-800">Close</button>
                                </div>

                                {selectedEvent?.notes && (
                                    <div className="mt-4 p-4 rounded-md border border-gray-100 bg-gray-50 text-gray-800">{selectedEvent.notes}</div>
                                )}

                                {selectedEvent?.meta && (
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                                        {Object.entries(selectedEvent.meta).map(([k, v]) => (
                                            <div key={k} className="bg-gray-50 p-2 rounded text-gray-800 text-xs">{k}: <span className="font-medium">{String(v)}</span></div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-6 flex justify-end">
                                    <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 rounded bg-sky-700 text-white shadow hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300">Done</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
