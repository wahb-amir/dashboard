'use client';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast, { Toaster } from 'react-hot-toast';

type VerifyFor = 'update-contact' | 'change-password' | null;

interface Props {
  show: boolean;
  onClose: () => void;
  onVerify: () => void;
  verifyForAction: VerifyFor;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
}

const VerifyModal: React.FC<Props> = ({
  show,
  onClose,
  onVerify,
  verifyForAction,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
}) => {
  // create a stable element for the portal
  const elRef = useRef<HTMLDivElement | null>(null);
  if (!elRef.current && typeof document !== 'undefined') {
    elRef.current = document.createElement('div');
  }

  useEffect(() => {
    if (!elRef.current) return;

    const ROOT_ID = 'verify-modal-root';
    let root = document.getElementById(ROOT_ID);

    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      document.body.appendChild(root);
    }

    root.appendChild(elRef.current);

    return () => {
      if (!elRef.current) return;
      root = document.getElementById(ROOT_ID);
      if (root && elRef.current.parentElement === root) {
        root.removeChild(elRef.current);
        if (root.childElementCount === 0) {
          root.remove();
        }
      }
    };
  }, []);

  if (!show || !elRef.current) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 z-[9999]"
      style={{ zIndex: 9999 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal content */}
      <div className="bg-white rounded shadow p-6 w-full max-w-md relative">
        {/* Local Toaster always on top of modal */}
        <Toaster
          position="top-right"
          containerClassName="!z-[10000]" // ensure above modal
        />

        <h3 className="text-lg font-medium mb-2 text-black">Verify your password</h3>
        <p className="text-sm text-gray-800 mb-4">Enter your current password to continue.</p>

        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3 text-black"
        />

        {verifyForAction === 'change-password' && (
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3"
          />
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border rounded text-sm text-black"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(); // optional: dismiss existing toasts
              onVerify();
            }}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
          >
            Verify & Continue
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, elRef.current);
};

export default VerifyModal;
