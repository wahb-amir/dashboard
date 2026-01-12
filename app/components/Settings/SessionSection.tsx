'use client';
import React from 'react';

interface Props {
  onLogoutCurrent: () => void;
}

const SessionSection: React.FC<Props> = ({ onLogoutCurrent }) => {
  return (
    <section className="bg-white shadow rounded p-4 mb-6">
      <h2 className="text-lg font-medium text-gray-700">Session</h2>
      <p className="text-sm text-gray-700 mb-3">Log out from this device.</p>
      <button onClick={onLogoutCurrent} className="px-3 py-2 bg-gray-800 text-white rounded text-sm">
        Log out
      </button>
    </section>
  );
};

export default SessionSection;
