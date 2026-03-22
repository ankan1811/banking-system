'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/api/client';

export default function ResyncButton({ bankRecordId }: { bankRecordId: string }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiRequest(`/api/accounts/${bankRecordId}/sync`, { method: 'POST' });
      window.location.reload();
    } catch (err) {
      console.error('Resync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-violet-400 border border-slate-700/50 hover:border-violet-500/30 rounded-lg transition-colors disabled:opacity-50"
    >
      <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
      {syncing ? 'Syncing...' : 'Resync with bank'}
    </button>
  );
}
