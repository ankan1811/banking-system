'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, CheckCircle, FileText } from 'lucide-react';

const BANKS = [
  'SBI Bank', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank', 'PNB Bank', 'BOB Bank',
  'Canara Bank', 'Union Bank', 'IndusInd Bank', 'Yes Bank', 'IDFC First Bank',
  'Federal Bank', 'RBL Bank', 'Other Bank',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function StatementUpload() {
  const router = useRouter();
  const [bankName, setBankName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ bankRecordId: string; transactionCount: number } | null>(null);
  const [error, setError] = useState('');
  const [dummyLoading, setDummyLoading] = useState(false);

  const handleUseDummy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDummyLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/statements/upload-dummy`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load dummy statement');
      setResult(data);
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dummy statement');
    } finally {
      setDummyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !file) return;

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankName', bankName);

      const res = await fetch(`${API_BASE}/api/statements/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setResult(data);
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {/* Bank selector */}
      <div className="glass-card p-5 space-y-3">
        <label className="text-sm font-medium text-slate-300">Select Your Bank</label>
        <select
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
          defaultValue=""
          className="w-full px-3 pr-10 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50 appearance-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
        >
          <option value="" disabled>Choose bank...</option>
          {BANKS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* File upload */}
      <div className="glass-card p-5 space-y-3">
        <label className="text-sm font-medium text-slate-300">Upload CSV Statement</label>
        <label
          className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            file
              ? 'border-violet-500/40 bg-violet-500/5'
              : 'border-slate-600/50 hover:border-violet-500/30 hover:bg-white/[0.02]'
          }`}
        >
          {file ? (
            <>
              <FileText size={32} className="text-violet-400" />
              <div className="text-center">
                <p className="text-sm text-white">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </>
          ) : (
            <>
              <Upload size={32} className="text-slate-500" />
              <div className="text-center">
                <p className="text-sm text-slate-400">Click to select CSV file</p>
                <p className="text-xs text-slate-600 mt-1">Download from your bank's net banking portal</p>
              </div>
            </>
          )}
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
        <p className="text-center text-xs text-slate-500 mt-2">
          or{' '}
          <span
            role="button"
            onClick={handleUseDummy}
            className="text-violet-300 hover:text-violet-200 cursor-pointer underline underline-offset-2 font-medium"
          >
            {dummyLoading ? 'loading...' : 'use dummy SBI bank CSV'}
          </span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card p-4 border border-rose-500/30 bg-rose-500/5">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm text-emerald-300">
              Imported {result.transactionCount} transactions from {bankName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Redirecting to home...</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!bankName || !file || uploading}
        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Uploading & Parsing...
          </>
        ) : (
          <>
            <Upload size={18} />
            Upload Statement
          </>
        )}
      </button>

      {/* Help text */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Supported banks: SBI, HDFC, ICICI, Axis, Kotak, and any bank with a standard CSV format
          containing Date, Description, Debit/Credit columns. Download your statement as CSV from
          your bank's net banking or mobile app.
        </p>
      </div>
    </form>
  );
}
