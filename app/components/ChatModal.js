// src/components/ChatWidget.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatModal from './ChatModal';
import { rtdb } from '../lib/firebase';
import { ref as dbRef, onValue, off } from 'firebase/database';

export default function ChatWidget({ projectId, currentUser }) {
    const [open, setOpen] = useState(false); // drawer open
    const [chatDev, setChatDev] = useState(null); // selected dev
    const [devs, setDevs] = useState([]);

    // listen for dev presence + list
    useEffect(() => {
        if (!rtdb) return;
        const devsRef = dbRef(rtdb, 'devs'); // assume your devs info stored here
        const unsub = onValue(devsRef, (snap) => {
            const val = snap.val() || {};
            // val = { devId: { name, online, lastSeen, _pid } }
            setDevs(Object.entries(val).map(([id, info]) => ({ id, ...info })));
        });
        return () => { try { off(devsRef); } catch (e) { } };
    }, []);

    return (
        <>
            {/* floating bubble */}
            <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start">
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="bg-sky-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-sky-700 transition"
                    title="Chat with a developer"
                >
                    💬
                </button>

                {/* drawer with devs */}
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="mt-2 w-64 bg-white rounded-lg shadow-xl border overflow-hidden"
                        >
                            <div className="p-2 border-b font-semibold text-gray-700">Select a developer</div>
                            <div className="max-h-72 overflow-auto">
                                {devs.length === 0 && (
                                    <div className="p-3 text-sm text-gray-500">No developers online</div>
                                )}
                                {devs.map((dev) => (
                                    <button
                                        key={dev.id}
                                        onClick={() => setChatDev(dev)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left rounded transition"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${dev.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span>{dev.name}</span>
                                        </div>
                                        {!dev.online && dev.lastSeen && (
                                            <span className="text-xs text-gray-400">Last: {new Date(dev.lastSeen).toLocaleTimeString()}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* chat modal */}
            {chatDev && (
                <ChatModal
                    open={!!chatDev}
                    onClose={() => setChatDev(null)}
                    projectId={projectId}
                    dev={chatDev}
                    currentUser={currentUser}
                />
            )}
        </>
    );
}
