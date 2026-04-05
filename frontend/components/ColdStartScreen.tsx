'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  TrendingUp, Target, BarChart3, Trophy, CreditCard, Bell,
  CheckCircle2, Swords, Shield,
} from 'lucide-react';
import SnakeGame from './SnakeGame';
import CircuitCanvas from './CircuitCanvas';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const STATUS_MESSAGES = [
  { at: 0,   text: 'Booting the financial servers',                       emoji: '🏦' },
  { at: 10,  text: 'Fetching your account data',                          emoji: '💳' },
  { at: 20,  text: 'Almost connected',                                    emoji: '⚡' },
  { at: 40,  text: 'Syncing with the database',                           emoji: '🔄' },
  { at: 120, text: 'Taking longer than expected. Please try again later', emoji: '🌐' },
];

const TIPS = [
  'AI-powered insights analyze your spending habits',
  'Track budgets, goals, and net worth in one place',
  'Connect multiple bank accounts securely',
  'Get monthly financial health scores',
  'Set spending challenges and earn streaks',
  'Export transactions as CSV or PDF reports',
];

const FEATURE_PILLS = [
  { Icon: TrendingUp, label: 'AI Insights'   },
  { Icon: Target,     label: 'Budgets'       },
  { Icon: BarChart3,  label: 'Net Worth'     },
  { Icon: Trophy,     label: 'Challenges'    },
  { Icon: CreditCard, label: 'Transactions'  },
  { Icon: Bell,       label: 'Smart Alerts'  },
];

const TRUST_STAGES = [
  { label: 'Encrypted', threshold: 8  },
  { label: 'Verified',  threshold: 16 },
  { label: 'Secured',   threshold: 24 },
];

function getStatus(seconds: number) {
  let result = STATUS_MESSAGES[0];
  for (const s of STATUS_MESSAGES) {
    if (seconds >= s.at) result = s;
  }
  return result;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ColdStartScreen() {
  const [elapsed, setElapsed]       = useState(0);
  const [ready, setReady]           = useState(false);
  const [fading, setFading]         = useState(false);
  const [exitOverlay, setExitOverlay] = useState(false);
  const [tipIndex, setTipIndex]     = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parallax refs — mutated directly, no re-renders
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1);
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

          // T+0ms: start card fade
          if (!cancelled) setFading(true);

          // T+600ms: show exit overlay
          setTimeout(() => {
            if (!cancelled) setExitOverlay(true);
          }, 600);

          // T+2200ms: reload
          setTimeout(() => {
            if (!cancelled) window.location.reload();
          }, 2200);
        }
      } catch {
        // Backend still cold
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Rotating tips
  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [ready]);

  // Mouse parallax — imperative DOM mutations, zero re-renders
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = (e.clientX - cx) / cx;
      const ny = (e.clientY - cy) / cy;

      if (cardRef.current) {
        cardRef.current.style.transform = `translate(${nx * 6}px, ${ny * 4}px)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform =
          `translate(calc(-50% + ${nx * 40}px), calc(-50% + ${ny * 30}px))`;
      }
      if (logoRef.current) {
        logoRef.current.style.transform = `translate(${nx * -3}px, ${ny * -2}px)`;
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, []);

  const status = getStatus(elapsed);
  const showRetry = !ready && elapsed >= 120;
  const progressPct = ready ? 100 : Math.min((elapsed / 75) * 100, 99);

  return (
    <>
      {/* Circuit canvas background */}
      <CircuitCanvas serverReady={ready} elapsed={elapsed} />

      {/* Exit overlay */}
      {exitOverlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080c1a]"
          style={{ animation: 'overlay-fade-in 0.2s ease-out forwards' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle 300px at center, rgba(16,185,129,0.12) 0%, transparent 70%)',
            }}
          />
          <div
            style={{
              animation: 'exit-icon-pop 0.45s cubic-bezier(0.16,1,0.3,1) 0.1s both',
            }}
          >
            <CheckCircle2
              size={64}
              className="text-emerald-400"
              style={{
                filter:
                  'drop-shadow(0 0 24px rgba(52,211,153,0.7)) drop-shadow(0 0 48px rgba(52,211,153,0.3))',
              }}
            />
          </div>
          <p
            className="mt-6 text-xl font-space-grotesk font-semibold text-white tracking-tight"
            style={{ animation: 'overlay-fade-in 0.35s ease-out 0.35s both' }}
          >
            Connected — Loading your dashboard...
          </p>
          <span
            className="mt-3 dot-pulse text-emerald-400 text-2xl"
            style={{ animation: 'overlay-fade-in 0.35s ease-out 0.55s both' }}
          >
            <span className="inline-block mx-[2px]">.</span>
            <span className="inline-block mx-[2px]">.</span>
            <span className="inline-block mx-[2px]">.</span>
          </span>
        </div>
      )}

      {/* Main content */}
      <div
        className={`relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-8 pb-14 transition-all duration-500 ${
          fading ? 'opacity-0 scale-[0.97]' : 'opacity-100'
        }`}
      >
        {/* Ambient glow — moves with mouse */}
        <div
          ref={glowRef}
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            width: 600,
            height: 400,
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, rgba(34,211,238,0.04) 40%, transparent 70%)',
            filter: 'blur(60px)',
            transition: 'transform 0.15s ease-out',
          }}
        />

        {/* Logo — moves opposite to cursor for depth */}
        <div
          ref={logoRef}
          className="relative mb-8 animate-[slide-up_0.5s_ease-out]"
          style={{ transition: 'transform 0.1s ease-out' }}
        >
          <div className="relative w-10 h-10">
            <div className="cold-orbit-ring" />
            <Image
              src="/icons/logo.svg"
              width={40}
              height={40}
              alt="logo"
              className="relative"
            />
          </div>
        </div>

        {/* Brand + timer row */}
        <div className="relative w-full max-w-md lg:max-w-4xl mb-6 animate-[slide-up_0.5s_ease-out]">
          <h1 className="text-2xl font-bold font-ibm-plex-serif text-white text-center">
            Ankan&apos;s Bank
          </h1>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-mono font-bold text-white tracking-wider">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Scanning border wrapper → float animation outer, parallax inner */}
        <div className="animate-float relative z-10 w-full max-w-md lg:max-w-4xl animate-[slide-up_0.6s_ease-out]">
          <div
            ref={cardRef}
            style={{ transition: 'transform 0.15s ease-out' }}
          >
            {/* Scanning glow border */}
            <div
              className="relative rounded-2xl p-[1px]"
              style={
                ready
                  ? { background: 'linear-gradient(135deg, #10b981, #34d399)' }
                  : undefined
              }
            >
              {!ready && (
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden"
                  style={{
                    background:
                      'conic-gradient(from var(--border-angle), #8b5cf618, #22d3ee35, #8b5cf618, #8b5cf60a)',
                    animation: 'border-spin 8s linear infinite',
                  }}
                />
              )}

              {/* Card */}
              <div
                className="glass-card overflow-hidden relative transition-all duration-500 hover:shadow-[0_8px_50px_rgba(0,0,0,0.5),0_0_140px_rgba(139,92,246,0.12),0_0_80px_rgba(34,211,238,0.06)]"
                style={{
                  boxShadow:
                    '0 8px 40px rgba(0,0,0,0.5), 0 0 120px rgba(139,92,246,0.08), 0 0 60px rgba(34,211,238,0.04)',
                }}
              >
                {/* Progress bar — top edge of card */}
                <div className="h-[3px] w-full overflow-hidden bg-white/[0.04]">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${progressPct}%`,
                      background: ready
                        ? '#10b981'
                        : `linear-gradient(90deg, #8b5cf6, #22d3ee ${progressPct}%)`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* ── Left panel ── */}
                  <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 lg:px-10 lg:pb-10 lg:pt-6 flex flex-col items-center justify-center text-center lg:border-r lg:border-white/[0.06]">

                    {/* Status message */}
                    {ready ? (
                      <div
                        className="flex items-center justify-center gap-2.5 mb-6"
                        style={{ animation: 'status-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)]" />
                        <span
                          className="text-emerald-400 font-bold text-2xl sm:text-3xl font-space-grotesk tracking-tight"
                          style={{ textShadow: '0 0 20px rgba(52,211,153,0.3)' }}
                        >
                          Server is ready!
                        </span>
                      </div>
                    ) : (
                      <p
                        key={status.text}
                        className="text-2xl sm:text-3xl font-space-grotesk font-bold tracking-tight mb-6"
                        style={{
                          animation: 'status-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
                          textShadow:
                            '0 0 30px rgba(139,92,246,0.2), 0 0 60px rgba(34,211,238,0.1)',
                        }}
                      >
                        <span className="bg-gradient-to-r from-violet-300 via-white to-cyan-300 bg-clip-text text-transparent">
                          {status.text}
                        </span>
                        <span className="ml-2">{status.emoji}</span>
                        <span className="dot-pulse">
                          <span className="inline-block mx-[1px]">.</span>
                          <span className="inline-block mx-[1px]">.</span>
                          <span className="inline-block mx-[1px]">.</span>
                        </span>
                      </p>
                    )}

                    {/* Timer with pulse rings */}
                    <div className="relative flex items-center justify-center mb-6">
                      {!ready && (
                        <>
                          {[0, 1.3, 2.6].map(delay => (
                            <div
                              key={delay}
                              className="absolute w-20 h-20 rounded-full"
                              style={{
                                border: `1px solid rgba(${delay === 2.6 ? '34,211,238' : '139,92,246'},${delay === 0 ? '0.2' : delay === 1.3 ? '0.15' : '0.12'})`,
                                animation: 'pulse-ring 4s ease-out infinite',
                                animationDelay: `${delay}s`,
                              }}
                            />
                          ))}
                        </>
                      )}
                      <span className="relative text-2xl font-mono font-medium text-slate-300 tracking-wider py-4 pl-2">
                        {formatTime(elapsed)}
                      </span>
                    </div>

                    {/* Portfolio link */}
                    {!ready && !showRetry && (
                      <div className="relative z-20 mb-4 space-y-1">
                        <p className="text-xs text-slate-400 tracking-widest uppercase">
                          Visit my portfolio
                        </p>
                        <a
                          href="https://ankanpal.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative z-20 inline-block text-base sm:text-lg font-semibold font-ibm-plex-serif text-cyan-400/90 hover:text-cyan-300 transition-all duration-300 cursor-pointer"
                        >
                          ankanpal.com
                          <span className="block h-[1px] mt-0.5 bg-gradient-to-r from-cyan-500 via-cyan-400 to-violet-400 rounded-full opacity-20" />
                        </a>
                      </div>
                    )}

                    {/* Feature pills — 6 with Lucide icons */}
                    {!ready && (
                      <div className="w-full mt-5 grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {FEATURE_PILLS.map(({ Icon, label }, i) => (
                          <div
                            key={label}
                            className="feature-pill group/pill flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 cursor-default select-none"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          >
                            <Icon
                              size={14}
                              className="text-violet-400 transition-transform duration-300 group-hover/pill:scale-125 group-hover/pill:-rotate-12 shrink-0"
                            />
                            <span className="text-xs font-space-grotesk font-medium text-[#b7c5d6] transition-colors duration-300 group-hover/pill:text-slate-200">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rotating tips */}
                    {!ready && (
                      <div className="w-full mt-3 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3.5 min-h-[52px] flex items-center justify-center">
                        <p
                          className="text-sm text-[#b7c5d6]"
                          style={{
                            opacity: tipVisible ? 1 : 0,
                            transition: 'opacity 0.2s ease',
                          }}
                        >
                          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mr-1.5">
                            &#10024;
                          </span>
                          {TIPS[tipIndex]}
                        </p>
                      </div>
                    )}

                    {/* Security trust bar */}
                    <div className="w-full mt-4">
                      <div className="flex items-center gap-1.5 mb-2 justify-center">
                        <Shield size={12} className="text-violet-400" />
                        <span className="text-[10px] font-space-grotesk font-semibold text-slate-400 tracking-widest uppercase">
                          Security
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {TRUST_STAGES.map(({ label, threshold }) => {
                          const filled = ready || elapsed >= threshold;
                          return (
                            <div key={label} className="flex-1 flex flex-col gap-1">
                              <div className="h-[3px] w-full rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: filled ? '100%' : '0%',
                                    background: ready ? '#10b981' : '#8b5cf6',
                                    boxShadow: filled
                                      ? ready
                                        ? '0 0 6px rgba(16,185,129,0.5)'
                                        : '0 0 6px rgba(139,92,246,0.4)'
                                      : 'none',
                                  }}
                                />
                              </div>
                              <span
                                className={`text-[9px] font-mono font-medium text-center transition-colors duration-500 ${
                                  filled
                                    ? ready ? 'text-emerald-400' : 'text-violet-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── Right panel — Snake game ── */}
                  {!ready && (
                    <div className="p-5 sm:p-6 lg:p-8 flex flex-col items-center justify-center border-t lg:border-t-0 border-white/[0.06] bg-white/[0.01]">
                      {/* Styled header badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                          <Swords
                            size={13}
                            className="text-violet-400 shrink-0"
                          />
                          <span className="text-sm font-space-grotesk font-semibold tracking-tight bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                            Warm up while you wait
                          </span>
                          <span className="text-sm">⚡</span>
                        </div>
                      </div>
                      <SnakeGame />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
