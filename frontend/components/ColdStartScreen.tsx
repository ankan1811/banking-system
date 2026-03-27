'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import SnakeGame from './SnakeGame';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const STATUS_MESSAGES = [
  { at: 0, text: 'Waking up the server', emoji: '🚀' },
  { at: 10, text: 'Still warming', emoji: '🧨' },
  { at: 20, text: 'Almost there', emoji: '🔥' },
  { at: 40, text: 'Taking a bit longer than usual', emoji: '🧯' },
  { at: 120, text: 'Server seems to be down. Please try again later', emoji: '☄️' },
];

const TIPS = [
  'AI-powered insights analyze your spending habits',
  'Track budgets, goals, and net worth in one place',
  'Connect multiple bank accounts securely',
  'Get monthly financial health scores',
  'Set spending challenges and earn streaks',
  'Export transactions as CSV or PDF reports',
];

const PARTICLES = [
  // Large bright stars
  { top: '8%',  left: '15%', size: 10, color: '#8b5cf6', duration: 20, delay: 0,   twinkle: 3,   star: true  },
  { top: '18%', left: '80%', size: 8,  color: '#22d3ee', duration: 16, delay: -3,  twinkle: 4,   star: true  },
  { top: '45%', left: '5%',  size: 9,  color: '#22d3ee', duration: 22, delay: -7,  twinkle: 3.5, star: true  },
  { top: '70%', left: '88%', size: 10, color: '#8b5cf6', duration: 18, delay: -11, twinkle: 2.8, star: true  },
  { top: '85%', left: '35%', size: 8,  color: '#8b5cf6', duration: 19, delay: -5,  twinkle: 4.2, star: true  },
  { top: '30%', left: '50%', size: 9,  color: '#22d3ee', duration: 21, delay: -9,  twinkle: 3.2, star: true  },
  { top: '58%', left: '48%', size: 10, color: '#8b5cf6', duration: 17, delay: -14, twinkle: 3.8, star: true  },
  { top: '4%',  left: '68%', size: 8,  color: '#22d3ee', duration: 23, delay: -2,  twinkle: 2.6, star: true  },
  { top: '78%', left: '15%', size: 9,  color: '#8b5cf6', duration: 20, delay: -8,  twinkle: 3.4, star: true  },
  { top: '22%', left: '92%', size: 8,  color: '#22d3ee', duration: 18, delay: -13, twinkle: 4.4, star: true  },
  { top: '90%', left: '72%', size: 10, color: '#8b5cf6', duration: 21, delay: -6,  twinkle: 2.9, star: true  },
  { top: '42%', left: '25%', size: 9,  color: '#22d3ee', duration: 19, delay: -10, twinkle: 3.7, star: true  },
  // Medium stars
  { top: '5%',  left: '45%', size: 7,  color: '#8b5cf6', duration: 17, delay: -2,  twinkle: 2.5, star: true  },
  { top: '55%', left: '70%', size: 6,  color: '#22d3ee', duration: 15, delay: -8,  twinkle: 3.8, star: true  },
  { top: '38%', left: '92%', size: 7,  color: '#8b5cf6', duration: 23, delay: -4,  twinkle: 2.2, star: true  },
  { top: '92%', left: '12%', size: 6,  color: '#22d3ee', duration: 18, delay: -6,  twinkle: 4.5, star: true  },
  { top: '62%', left: '22%', size: 7,  color: '#8b5cf6', duration: 20, delay: -10, twinkle: 3,   star: true  },
  { top: '15%', left: '60%', size: 6,  color: '#22d3ee', duration: 16, delay: -1,  twinkle: 3.6, star: true  },
  { top: '28%', left: '8%',  size: 7,  color: '#8b5cf6', duration: 19, delay: -13, twinkle: 2.8, star: true  },
  { top: '72%', left: '55%', size: 6,  color: '#22d3ee', duration: 22, delay: -7,  twinkle: 4.1, star: true  },
  { top: '48%', left: '78%', size: 7,  color: '#8b5cf6', duration: 15, delay: -3,  twinkle: 3.3, star: true  },
  { top: '82%', left: '42%', size: 6,  color: '#22d3ee', duration: 21, delay: -11, twinkle: 2.4, star: true  },
  { top: '10%', left: '22%', size: 7,  color: '#22d3ee', duration: 17, delay: -5,  twinkle: 3.9, star: true  },
  { top: '65%', left: '95%', size: 6,  color: '#8b5cf6', duration: 20, delay: -9,  twinkle: 2.7, star: true  },
  // Small twinkling dots
  { top: '12%', left: '30%', size: 4,  color: '#a78bfa', duration: 19, delay: -3,  twinkle: 2,   star: false },
  { top: '25%', left: '72%', size: 3,  color: '#67e8f9', duration: 14, delay: -7,  twinkle: 2.8, star: false },
  { top: '40%', left: '12%', size: 4,  color: '#67e8f9', duration: 21, delay: -12, twinkle: 1.8, star: false },
  { top: '52%', left: '42%', size: 3,  color: '#a78bfa', duration: 17, delay: -5,  twinkle: 3.2, star: false },
  { top: '65%', left: '58%', size: 4,  color: '#a78bfa', duration: 22, delay: -9,  twinkle: 2.4, star: false },
  { top: '78%', left: '75%', size: 3,  color: '#67e8f9', duration: 15, delay: -2,  twinkle: 3.5, star: false },
  { top: '88%', left: '55%', size: 4,  color: '#67e8f9', duration: 20, delay: -8,  twinkle: 2.6, star: false },
  { top: '3%',  left: '88%', size: 3,  color: '#a78bfa', duration: 18, delay: -4,  twinkle: 1.5, star: false },
  { top: '48%', left: '95%', size: 4,  color: '#a78bfa', duration: 16, delay: -6,  twinkle: 3,   star: false },
  { top: '75%', left: '3%',  size: 3,  color: '#67e8f9', duration: 23, delay: -11, twinkle: 2.2, star: false },
  { top: '33%', left: '35%', size: 3,  color: '#a78bfa', duration: 19, delay: -1,  twinkle: 4,   star: false },
  { top: '95%', left: '65%', size: 4,  color: '#67e8f9', duration: 17, delay: -10, twinkle: 2,   star: false },
  { top: '7%',  left: '52%', size: 3,  color: '#a78bfa', duration: 18, delay: -13, twinkle: 2.3, star: false },
  { top: '20%', left: '38%', size: 4,  color: '#67e8f9', duration: 16, delay: -6,  twinkle: 3.1, star: false },
  { top: '35%', left: '65%', size: 3,  color: '#a78bfa', duration: 22, delay: -9,  twinkle: 1.9, star: false },
  { top: '50%', left: '8%',  size: 4,  color: '#67e8f9', duration: 19, delay: -2,  twinkle: 3.7, star: false },
  { top: '60%', left: '32%', size: 3,  color: '#a78bfa', duration: 15, delay: -14, twinkle: 2.6, star: false },
  { top: '73%', left: '48%', size: 4,  color: '#67e8f9', duration: 21, delay: -4,  twinkle: 3.4, star: false },
  { top: '83%', left: '82%', size: 3,  color: '#a78bfa', duration: 17, delay: -8,  twinkle: 2.1, star: false },
  { top: '93%', left: '25%', size: 4,  color: '#67e8f9', duration: 20, delay: -11, twinkle: 3.8, star: false },
  { top: '16%', left: '5%',  size: 3,  color: '#a78bfa', duration: 23, delay: -7,  twinkle: 2.5, star: false },
  { top: '55%', left: '88%', size: 4,  color: '#67e8f9', duration: 18, delay: -1,  twinkle: 3.3, star: false },
  { top: '68%', left: '15%', size: 3,  color: '#a78bfa', duration: 16, delay: -10, twinkle: 4.2, star: false },
  { top: '43%', left: '72%', size: 4,  color: '#67e8f9', duration: 22, delay: -5,  twinkle: 1.7, star: false },
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
  const [elapsed, setElapsed] = useState(0);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
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

          setTimeout(() => {
            if (!cancelled) setFading(true);
          }, 800);
          setTimeout(() => {
            if (!cancelled) window.location.reload();
          }, 1500);
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
        setTipIndex((i) => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [ready]);

  const status = getStatus(elapsed);
  const showRetry = !ready && elapsed >= 120;

  return (
    <div 
      className={`auth-bg min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 transition-all duration-700 ${
        fading ? 'opacity-0 scale-[0.97]' : 'opacity-100'
      }`}
      style={{ transition: 'opacity 0.7s ease, transform 0.7s ease' }}
    >
      {/* Floating star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className={`cold-particle ${p.star ? 'cold-particle-star' : 'rounded-full'}`}
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              background: p.color,
              '--duration': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--twinkle': `${p.twinkle}s`,
              '--min-opacity': p.star ? 0.25 : 0.15,
              '--max-opacity': p.star ? 0.9 : 0.6,
              boxShadow: p.star
                ? `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 5}px ${p.color}80, 0 0 ${p.size * 10}px ${p.color}30`
                : `0 0 ${p.size * 3}px ${p.color}90`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Large ambient glow behind content */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, rgba(34,211,238,0.04) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Logo with visible orbit ring */}
      <div className="relative mb-8 animate-[slide-up_0.5s_ease-out]">
        <div className="relative w-10 h-10">
          <div className="cold-orbit-ring" />
          <Image src="/icons/logo.svg" width={40} height={40} alt="logo" className="relative" />
        </div>
      </div>

      {/* Brand centered, timer top-right — same line */}
      <div className="relative w-full max-w-md lg:max-w-4xl mb-6 animate-[slide-up_0.5s_ease-out]">
        <h1 className="text-2xl font-bold font-ibm-plex-serif text-white text-center">
          Ankan&apos;s Bank
        </h1>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl font-mono font-bold text-white tracking-wider">
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md lg:max-w-4xl animate-[slide-up_0.6s_ease-out] animate-float">
        <div
          className="glass-card overflow-hidden transition-all duration-500 hover:border-white/[0.12] hover:shadow-[0_8px_50px_rgba(0,0,0,0.5),0_0_140px_rgba(139,92,246,0.12),0_0_80px_rgba(34,211,238,0.06)]"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 120px rgba(139,92,246,0.08), 0 0 60px rgba(34,211,238,0.04)' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left — Status */}
            <div className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8 sm:pt-5 lg:px-10 lg:pb-10 lg:pt-6 flex flex-col items-center justify-center text-center lg:border-r lg:border-white/[0.06]">
              {/* Status — hero position */}
              {ready ? (
                <div
                  className="flex items-center justify-center gap-2.5 mb-6"
                  style={{ animation: 'status-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)]" />
                  <span className="text-emerald-400 font-bold text-2xl sm:text-3xl font-space-grotesk tracking-tight" style={{ textShadow: '0 0 20px rgba(52,211,153,0.3)' }}>Server is ready!</span>
                </div>
              ) : (
                <p
                  key={status.text}
                  className="text-2xl sm:text-3xl font-space-grotesk font-bold tracking-tight mb-6"
                  style={{
                    animation: 'status-enter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
                    textShadow: '0 0 30px rgba(139,92,246,0.2), 0 0 60px rgba(34,211,238,0.1)',
                  }}
                >
                  <span className="bg-gradient-to-r from-violet-300 via-white to-cyan-300 bg-clip-text text-transparent">{status.text}</span>
                  <span className="ml-2">{status.emoji}</span>
                  <span className="dot-pulse">
                    <span className="inline-block mx-[1px]">.</span>
                    <span className="inline-block mx-[1px]">.</span>
                    <span className="inline-block mx-[1px]">.</span>
                  </span>
                </p>
              )}

              {/* Timer with pulse rings — softened */}
              <div className="relative flex items-center justify-center mb-6">
                {!ready && (
                  <>
                    <div
                      className="absolute w-20 h-20 rounded-full"
                      style={{
                        border: '1px solid rgba(139,92,246,0.2)',
                        animation: 'pulse-ring 4s ease-out infinite',
                      }}
                    />
                    <div
                      className="absolute w-20 h-20 rounded-full"
                      style={{
                        border: '1px solid rgba(139,92,246,0.15)',
                        animation: 'pulse-ring 4s ease-out infinite',
                        animationDelay: '1.3s',
                      }}
                    />
                    <div
                      className="absolute w-20 h-20 rounded-full"
                      style={{
                        border: '1px solid rgba(34,211,238,0.12)',
                        animation: 'pulse-ring 4s ease-out infinite',
                        animationDelay: '2.6s',
                      }}
                    />
                  </>
                )}
                <span className="relative text-2xl font-mono font-medium text-slate-300 tracking-wider py-4">
                  {formatTime(elapsed)}
                </span>
              </div>

              {/* Portfolio link — demoted */}
              {!ready && !showRetry && (
                <div className="relative z-20 mb-4 space-y-1">
                  <p className="text-xs text-slate-400 tracking-widest uppercase">Visit my portfolio</p>
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

              {/* Feature highlights */}
              {!ready && (
                <div className="w-full mt-5 grid grid-cols-2 gap-2">
                  {[
                    { icon: '📊', label: 'AI Insights' },
                    { icon: '🎯', label: 'Budgets & Goals' },
                    { icon: '📈', label: 'Net Worth' },
                    { icon: '🏆', label: 'Challenges' },
                  ].map((f, i) => (
                    <div
                      key={f.label}
                      className="feature-pill group/pill flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 cursor-default select-none"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    >
                      <span className="text-sm transition-transform duration-300 group-hover/pill:scale-125 group-hover/pill:-rotate-12">{f.icon}</span>
                      <span className="text-xs font-space-grotesk font-medium text-[#b7c5d6] transition-colors duration-300 group-hover/pill:text-slate-200">{f.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rotating tips */}
              {!ready && (
                <div className="w-full mt-3 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3.5 min-h-[52px] flex items-center justify-center">
                  <p
                    className="text-sm text-[#b7c5d6]"
                    style={{ opacity: tipVisible ? 1 : 0, transition: 'opacity 0.2s ease' }}
                  >
                    <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mr-1.5">&#10024;</span>
                    {TIPS[tipIndex]}
                  </p>
                </div>
              )}

            </div>

            {/* Right — Snake game */}
            {!ready && (
              <div className="p-5 sm:p-6 lg:p-8 flex flex-col items-center justify-center border-t lg:border-t-0 border-white/[0.06] bg-white/[0.01]">
                <p className="text-sm font-space-grotesk font-semibold tracking-tight text-slate-300 text-center mb-3">
                  While the servers warm up, can you beat the snake? ⚔️
                </p>
                <SnakeGame />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
