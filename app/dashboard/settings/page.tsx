'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

import AccountSection from '@/app/components/AccountSection';
import DevicesSection, { Device } from '@/app/components/DevicesSection';
import SessionSection from '@/app/components/SessionSection';
import VerifyModal from '@/app/components/VerifyModal';

const SettingsPage: React.FC = () => {
  const router = useRouter();

  // local "user" state (no context)
  const [name, setName] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('not-logged-in@example.com');

  // Contact email is editable; start blank until userinfo arrives
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactEmailInput, setContactEmailInput] = useState<string>('');

  // password / verify modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyForAction, setVerifyForAction] = useState<'update-contact' | 'change-password' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // saving + loading flags
  const [saving, setSaving] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  // devices
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // UI toggles (kept for parity with original — unused here)
  const [darkMode] = useState(false);
  const [notifyEmail] = useState(true);
  const [notifySms] = useState(false);

  // fetch user info on mount
  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        setLoadingUser(true);
        const res = await fetch('/api/auth/userinfo', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.auth) {
          toast.error('Authentication required. Redirecting to login...');
          router.push('/login?reason=auth');
          return;
        }

        if (!mounted) return;
        setName(data.user.name);
        setLoginEmail(data.user.email);
        setContactEmail(data.user.email ?? '');
        setContactEmailInput(data.user.email ?? '');

        // fetch devices after user is loaded
        fetchDevices();
      } catch (err) {
        console.error('userinfo fetch error:', err);
        toast.error('Authentication error. Redirecting to login...');
        router.push('/login?reason=auth');
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }
    loadUser();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDevices() {
    setLoadingDevices(true);
    try {
      const res = await fetch('/api/devices');
      const json = await res.json().catch(() => ({}));
      setDevices(json.devices || []);
    } catch (err) {
      toast.error('Failed to fetch devices');
    } finally {
      setLoadingDevices(false);
    }
  }

  function requestVerify(action: 'update-contact' | 'change-password') {
    setVerifyForAction(action);
    setCurrentPassword('');
    setNewPassword('');
    setShowVerifyModal(true);
  }

  async function handleVerifyAndProceed() {
    if (!currentPassword) {
      toast.error('Enter current password to verify');
      return;
    }

    const loadingId = toast.loading('Verifying password...');
    try {
      const body: any = { password: currentPassword };

      if (verifyForAction === 'update-contact') {
        body.contactEmail = contactEmailInput.trim();
      }

      const res = await fetch('/api/auth/contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      toast.dismiss(loadingId);

      if (!res.ok) {
        toast.error(data.message || 'Password verification failed');
        return;
      }

      setShowVerifyModal(false);

      if (verifyForAction === 'update-contact') {
        const updated = (data.updatedContactEmail !== undefined)
          ? data.updatedContactEmail
          : contactEmailInput.trim();
        setContactEmail(updated);
        setContactEmailInput(updated);
        toast.success('Contact email updated ✅');
        setCurrentPassword('');
      } else if (verifyForAction === 'change-password') {
        await handleChangePassword(true);
      }
    } catch (err) {
      toast.dismiss(loadingId);
      toast.error('Verification request failed');
      console.error(err);
    }
  }

  async function handleUpdateContact(verified = false) {
    if (!verified) {
      requestVerify('update-contact');
      return;
    }

    setSaving(true);
    const loadId = toast.loading('Updating contact email...');
    try {
      const res = await fetch('/api/settings/update-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactEmail: contactEmailInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok ) {
        toast.error(data.message || 'Failed to update contact email', { id: loadId });
        return;
      }

      setContactEmail(contactEmailInput.trim());
      toast.success('Contact email updated ✅', { id: loadId });
    } catch (err) {
      toast.error('Network error while updating contact email', { id: loadId });
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(verified = false) {
    if (!verified) {
      requestVerify('change-password');
      return;
    }

    if (!newPassword) {
      toast.error('Enter the new password');
      return;
    }

    setSaving(true);
    const loadId = toast.loading('Changing password...');
    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok ) {
        toast.error(data.message || 'Failed to change password', { id: loadId });
        return;
      }

      toast.success('Password changed successfully ✅', { id: loadId });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error('Network error while changing password', { id: loadId });
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutDevice(deviceId: string) {
    const loadId = toast.loading('Logging out device...');
    try {
      const res = await fetch(`/api/devices/${deviceId}/logout`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(loadId);
      if (!res.ok ) {
        toast.error(data.message || 'Failed to log out device');
        return;
      }
      toast.success('Device logged out');
      fetchDevices();
    } catch (err) {
      toast.dismiss(loadId);
      toast.error('Network error');
    }
  }

  async function handleLogoutAll() {
    const loadId = toast.loading('Logging out all devices...');
    try {
      const res = await fetch('/api/devices/logout-all', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(loadId);
      if (!res.ok ) {
        toast.error(data.message || 'Failed to log out all devices');
        return;
      }
      toast.success('All devices logged out');
      fetchDevices();
    } catch (err) {
      toast.dismiss(loadId);
      toast.error('Network error');
    }
  }

  async function handleLogoutCurrent() {
    const loadId = toast.loading('Logging out...');
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      toast.dismiss(loadId);
      if (!res.ok) {
        toast.error(data.message || 'Failed to log out');
        return;
      }
      toast.success('Logged out. Redirecting...');
      setTimeout(() => {
        router.push('/login');
      }, 600);
    } catch (err) {
      toast.dismiss(loadId);
      toast.error('Network error');
    }
  }

  // tiny loader so we don't flash sensitive UI
  if (loadingUser) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Toaster position="top-right" />
        <div>Loading account…</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-semibold mb-2 text-black">Settings</h1>
      <p className="text-sm text-black mb-6">
        Manage your account, theme, and notification settings.
      </p>

      <AccountSection
        name={name}
        loginEmail={loginEmail}
        contactEmail={contactEmail}
        contactEmailInput={contactEmailInput}
        setContactEmailInput={setContactEmailInput}
        onUpdateContact={handleUpdateContact}
        onResetContactInput={() => setContactEmailInput(contactEmail)}
        onRequestChangePassword={() => requestVerify('change-password')}
        saving={saving}
      />

      <DevicesSection
        devices={devices}
        loadingDevices={loadingDevices}
        onLogoutDevice={handleLogoutDevice}
        onLogoutAll={handleLogoutAll}
        onRefresh={fetchDevices}
        onLogoutCurrent={handleLogoutCurrent}
      />

      <SessionSection onLogoutCurrent={handleLogoutCurrent} />

      <VerifyModal
        show={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onVerify={handleVerifyAndProceed}
        verifyForAction={verifyForAction}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
      />
    </div>
  );
};

export default SettingsPage;
