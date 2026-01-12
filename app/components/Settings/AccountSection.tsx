'use client';
import React from 'react';

interface Props {
  name: string;
  loginEmail: string;
  contactEmail: string;
  contactEmailInput: string;
  setContactEmailInput: (v: string) => void;
  onUpdateContact: (verified?: boolean) => void;
  onResetContactInput: () => void;
  onRequestChangePassword: () => void;
  saving: boolean;
}

const AccountSection: React.FC<Props> = ({
  name,
  loginEmail,
  contactEmail,
  contactEmailInput,
  setContactEmailInput,
  onUpdateContact,
  onResetContactInput,
  onRequestChangePassword,
  saving,
}) => {
  return (
    <section className="bg-white shadow rounded p-4 mb-6">
      <h2 className="text-lg font-medium text-gray-700">Account</h2>
      <p className="text-sm text-gray-700 mb-4">
        Update your contact information. This does <strong>not</strong> change the email you use to
        log in.
      </p>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="text-xs text-gray-700">Name</label>
          <div className="mt-1 text-sm text-black">{name || '—'}</div>
        </div>

        <div>
          <label className="text-xs text-gray-700">Login Email</label>
          <div className="mt-1 text-sm text-black">{loginEmail}</div>
        </div>

        <div>
          <label className="text-xs text-gray-700">Contact Email</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2 text-black placeholder:text-gray-600"
            value={contactEmailInput}
            onChange={(e) => setContactEmailInput(e.target.value)}
          />
          <div className="text-xs text-gray-500 mt-1">
            Current contact email: <strong>{contactEmail || '— (none)'}</strong>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => onUpdateContact(false)}
              disabled={saving}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
            >
              Update Contact Email
            </button>
            <button
              onClick={onResetContactInput}
              className="px-3 py-2 border rounded text-sm text-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600">Change Password</label>
          <div className="mt-1 flex gap-2">
            <button
              onClick={onRequestChangePassword}
              className="px-3 py-2 bg-orange-500 text-white rounded text-sm"
            >
              Change Password
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            To change your password we will ask for your current password to verify it’s you.
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountSection;
