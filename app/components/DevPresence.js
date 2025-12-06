// src/components/DevPresence.jsx
import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { rtdb } from '../lib/firebase';
import { ref as dbRef, onValue, off } from 'firebase/database';

export default function DevPresence({ developers = [], onSelect = () => { }, showOnlyOnline = false }) {
    const [presenceMap, setPresenceMap] = useState({});

    useEffect(() => {
        if (!rtdb) return;
        const presenceRef = dbRef(rtdb, 'presence');
        onValue(presenceRef, (snap) => {
            setPresenceMap(snap.val() || {});
        }, (err) => {
            console.warn('presence read error', err);
        });

        return () => {
            try { off(presenceRef); } catch (e) { /* noop */ }
        };
    }, []);

    const list = developers.map((d) => {
        const id = d.id || d._id || (d.name ? d.name.replace(/\s+/g, '_') : Math.random().toString(36).slice(2, 8));
        const pres = presenceMap[id] || {};
        return { ...d, _pid: id, presence: pres };
    }).filter(Boolean).filter((d) => (showOnlyOnline ? !!d.presence?.online : true));

    return (
        <div className="bg-white p-4 rounded-xl shadow ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">Developers</h4>
                <div className="text-xs text-gray-500">{list.length} found</div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {list.length === 0 && <div className="text-sm text-gray-600">No developers available</div>}
                {list.map((dev) => {
                    const online = !!dev.presence?.online;
                    return (
                        <button key={dev._pid} onClick={() => onSelect(dev)} className={`w-full flex items-center justify-between gap-3 p-2 rounded-lg transition hover:bg-gray-50 focus:outline-none ${online ? 'border border-sky-100' : 'border border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${online ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-gray-900">{dev.name || 'Unnamed'}</div>
                                    <div className="text-xs text-gray-500">{dev.portfolio || dev.profile || ''}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                {online ? <div className="text-xs text-green-600 font-semibold">Online</div> : <div className="text-xs text-gray-500">Offline</div>}
                                {dev.presence?.lastSeen && <div className="text-[10px] text-gray-400 mt-1">{new Date(dev.presence.lastSeen).toLocaleString()}</div>}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
