'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { logoutAccount } from '@/lib/api/auth.api';

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
  allDevices?: boolean;
}

export default function LogoutModal({ open, onClose, allDevices = false }: LogoutModalProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutAccount();
      window.location.href = '/';
    } catch {
      setLoggingOut(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={loggingOut ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className={`relative glass-card p-6 w-full max-w-xs text-center space-y-5 transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Icon */}
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-white">
            {allDevices ? 'Log out everywhere?' : 'Log out?'}
          </h3>
          <p className="text-sm text-slate-400">
            {allDevices
              ? 'This will end all active sessions across every device.'
              : 'Are you sure you want to log out of your account?'}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loggingOut}
            className="flex-1 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30 hover:border-slate-500/50 rounded-xl text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 py-2.5 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 hover:border-rose-500/50 rounded-xl text-sm text-rose-300 hover:text-rose-200 transition-all disabled:opacity-50"
          >
            {loggingOut ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging out
              </span>
            ) : (
              'Log out'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
