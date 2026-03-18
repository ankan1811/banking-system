"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, deleteAccount, disconnectBank } from '@/lib/api/settings.api';
import { logoutAccount } from '@/lib/api/auth.api';

interface Props {
  user: any;
  accounts: any[];
}

export default function ProfileSettings({ user, accounts }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    address1: user.address1 || '',
    city: user.city || '',
    state: user.state || '',
    postalCode: user.postalCode || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (bankRecordId: string, bankName: string) => {
    if (!confirm(`Disconnect ${bankName}? This cannot be undone.`)) return;
    await disconnectBank(bankRecordId);
    router.refresh();
  };

  const handleLogoutAll = async () => {
    if (!confirm('Log out from all devices? You will need to sign in again.')) return;
    await logoutAccount();
    router.push('/sign-in');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      router.push('/sign-in');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Profile Information</h3>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-500 text-sm cursor-not-allowed"
          />
          <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">First Name</label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Last Name</label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">Address</label>
          <input
            type="text"
            value={form.address1}
            onChange={(e) => setForm({ ...form, address1: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              maxLength={2}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Zip Code</label>
            <input
              type="text"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-white text-sm transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-xs text-emerald-400">Profile updated!</span>}
        </div>
      </div>

      {/* Connected Banks */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Connected Banks</h3>

        {accounts.length === 0 ? (
          <p className="text-sm text-slate-500">No banks connected. Use the sidebar to link a bank.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc: any) => (
              <div
                key={acc.bankRecordId}
                className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg"
              >
                <div>
                  <p className="text-sm text-white">{acc.name}</p>
                  <p className="text-xs text-slate-500">****{acc.mask} · {acc.type}/{acc.subtype}</p>
                </div>
                <button
                  onClick={() => handleDisconnect(acc.bankRecordId, acc.name)}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Account</h3>

        <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
          <div>
            <p className="text-sm text-white">Logout All Devices</p>
            <p className="text-xs text-slate-500">Invalidate all active sessions</p>
          </div>
          <button
            onClick={handleLogoutAll}
            className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-lg transition-colors"
          >
            Logout All
          </button>
        </div>

        {/* Delete Account */}
        <div className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-lg space-y-3">
          <div>
            <p className="text-sm text-rose-300 font-medium">Danger Zone</p>
            <p className="text-xs text-slate-500">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="flex-1 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-rose-500/50"
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white text-xs transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-slate-600 text-center">
        Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
