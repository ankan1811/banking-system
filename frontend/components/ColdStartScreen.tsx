'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import SnakeGame from './SnakeGame';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const STATUS_MESSAGES = [
  { at: 0, text: 'Waking up the server' },
  { at: 10, text: 'Still warming up' },
  { at: 20, text: 'Almost there' },
  { at: 40, text: 'Taking a bit longer than usual' },
  { at: 120, text: 'Server seems to be down. Please try again later' },
];

function getStatusMessage(seconds: number) {
  let msg = STATUS_MESSAGES[0].text;
  for (const s of STATUS_MESSAGES) {
    if (seconds >= s.at) msg = s.text;
  }
  return msg;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ColdStartScreen() {
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Health polling
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
        if (res.ok && !cancelled) {
          setReady(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timerRef.current) clearInterval(timerRef.current);

          // Fade out then reload
          setTimeout(() => {
            if (!cancelled) setFading(true);
          }, 800);
          setTimeout(() => {
            if (!cancelled) window.location.reload();
          }, 1500);
        }
      } catch {
        // Backend still cold, keep polling
      }
    };

    // First poll immediately
    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const statusMessage = ready ? 'Server is ready!' : getStatusMessage(elapsed);
  const showRetry = !ready && elapsed >= 120;

  return (
    <div
      className={`auth-bg min-h-screen flex flex-col items-center justify-center px-4 py-8 transition-opacity duration-700 ${
        fading ? 'opacity-0 scale-[0.98]' : 'opacity-100'
      }`}
      style={{ transition: 'opacity 0.7s ease, transform 0.7s ease' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 animate-[slide-up_0.5s_ease-out]">
        <Image src="/icons/logo.svg" width={32} height={32} alt="logo" />
        <span className="text-xl font-bold font-ibm-plex-serif text-white">
          Ankan&apos;s Bank
        </span>
      </div>

      {/* Status card */}
      <div className="glass-card p-6 sm:p-8 w-full max-w-md text-center space-y-4 animate-[slide-up_0.6s_ease-out]">
        {/* Status indicator */}
        {ready ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
            <span className="text-emerald-400 font-semibold text-lg">{statusMessage}</span>
          </div>
        ) : (
          <>
            <p className="text-slate-200 text-lg font-medium">
              {statusMessage}
              <span className="dot-pulse">
                <span className="inline-block mx-[1px]">.</span>
                <span className="inline-block mx-[1px]">.</span>
                <span className="inline-block mx-[1px]">.</span>
              </span>
            </p>
          </>
        )}

        {/* Timer */}
        <div className="text-3xl font-mono font-bold text-white tracking-wider">
          {formatTime(elapsed)}
        </div>

        {/* Portfolio link */}
        {!ready && !showRetry && (
          <p className="text-sm text-slate-500">
            Visit my portfolio while you wait &rarr;{' '}
            <a
              href="https://ankanpal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              ankanpal.com
            </a>
          </p>
        )}

        {/* Retry button */}
        {showRetry && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:shadow-glow-violet transition-all duration-300 text-sm"
          >
            Retry
          </button>
        )}
      </div>

      {/* Snake game card */}
      {!ready && (
        <div className="glass-card p-5 sm:p-6 w-full max-w-md mt-5 animate-[slide-up_0.7s_ease-out]">
          <p className="text-sm text-slate-400 text-center mb-3">
            Play while you wait
          </p>
          <SnakeGame />
        </div>
      )}

    </div>
  );
}
