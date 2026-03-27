'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const GRID = 20;
const INITIAL_SPEED = 150;
const SPEED_STEP = 5;
const MIN_SPEED = 80;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };
type State = 'idle' | 'playing' | 'gameover';

export default function SnakeGame({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(400);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<State>('idle');

  // All mutable game state in refs to avoid stale closures
  const state = useRef<State>('idle');
  const snake = useRef<Pos[]>([{ x: 10, y: 10 }]);
  const food = useRef<Pos>({ x: 15, y: 10 });
  const dir = useRef<Dir>('RIGHT');
  const nextDir = useRef<Dir>('RIGHT');
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('snake-high-score');
      if (saved) setHighScore(Number(saved));
    } catch {}
  }, []);

  // Responsive canvas size
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setSize(Math.min(400, containerRef.current.clientWidth));
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const cell = size / GRID;

  const spawnFood = useCallback(() => {
    const occupied = new Set(snake.current.map((s) => `${s.x},${s.y}`));
    let pos: Pos;
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (occupied.has(`${pos.x},${pos.y}`));
    food.current = pos;
  }, []);

  const reset = useCallback(() => {
    snake.current = [{ x: 10, y: 10 }];
    dir.current = 'RIGHT';
    nextDir.current = 'RIGHT';
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    setScore(0);
    spawnFood();
  }, [spawnFood]);

  const startGame = useCallback(() => {
    reset();
    state.current = 'playing';
    setGameState('playing');
  }, [reset]);

  // Game tick
  const tick = useCallback(() => {
    if (state.current !== 'playing') return;

    dir.current = nextDir.current;
    const head = { ...snake.current[0] };

    switch (dir.current) {
      case 'UP': head.y--; break;
      case 'DOWN': head.y++; break;
      case 'LEFT': head.x--; break;
      case 'RIGHT': head.x++; break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      state.current = 'gameover';
      setGameState('gameover');
      if (tickRef.current) clearInterval(tickRef.current);
      // Save high score
      if (scoreRef.current > (Number(localStorage.getItem('snake-high-score')) || 0)) {
        localStorage.setItem('snake-high-score', String(scoreRef.current));
        setHighScore(scoreRef.current);
      }
      return;
    }

    // Self collision
    if (snake.current.some((s) => s.x === head.x && s.y === head.y)) {
      state.current = 'gameover';
      setGameState('gameover');
      if (tickRef.current) clearInterval(tickRef.current);
      if (scoreRef.current > (Number(localStorage.getItem('snake-high-score')) || 0)) {
        localStorage.setItem('snake-high-score', String(scoreRef.current));
        setHighScore(scoreRef.current);
      }
      return;
    }

    snake.current = [head, ...snake.current];

    // Eat food
    if (head.x === food.current.x && head.y === food.current.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      spawnFood();
      // Speed up
      speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_STEP);
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(tick, speedRef.current);
    } else {
      snake.current.pop();
    }
  }, [spawnFood]);

  // Start/restart tick interval
  useEffect(() => {
    if (gameState === 'playing') {
      tickRef.current = setInterval(tick, speedRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [gameState, tick]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const c = size / GRID;

      // Background
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, size, size);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID; i++) {
        ctx.beginPath();
        ctx.moveTo(i * c, 0);
        ctx.lineTo(i * c, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * c);
        ctx.lineTo(size, i * c);
        ctx.stroke();
      }

      // Food with glow
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(
        food.current.x * c + c / 2,
        food.current.y * c + c / 2,
        c * 0.35,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();

      // Snake body
      snake.current.forEach((seg, i) => {
        ctx.save();
        if (i === 0) {
          ctx.shadowColor = '#8b5cf6';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#8b5cf6';
        } else {
          ctx.shadowColor = '#8b5cf6';
          ctx.shadowBlur = 4;
          // Gradient from violet to slightly dimmer
          const alpha = 1 - (i / snake.current.length) * 0.4;
          ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
        }
        const pad = i === 0 ? 1 : 2;
        const radius = 4;
        const x = seg.x * c + pad;
        const y = seg.y * c + pad;
        const w = c - pad * 2;
        const h = c - pad * 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();
        ctx.restore();
      });

      // Overlays for idle / gameover
      if (state.current === 'idle' || state.current === 'gameover') {
        ctx.fillStyle = 'rgba(10, 14, 26, 0.75)';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = `bold ${Math.round(size * 0.045)}px Inter, sans-serif`;
        ctx.textAlign = 'center';

        if (state.current === 'idle') {
          ctx.fillText('Press Space or Tap to Start', size / 2, size / 2);
        } else {
          ctx.fillStyle = '#f87171';
          ctx.font = `bold ${Math.round(size * 0.06)}px Inter, sans-serif`;
          ctx.fillText('Game Over!', size / 2, size / 2 - size * 0.05);
          ctx.fillStyle = '#e2e8f0';
          ctx.font = `${Math.round(size * 0.04)}px Inter, sans-serif`;
          ctx.fillText(`Score: ${scoreRef.current}`, size / 2, size / 2 + size * 0.03);
          ctx.fillStyle = '#64748b';
          ctx.font = `${Math.round(size * 0.035)}px Inter, sans-serif`;
          ctx.fillText('Space or Tap to Restart', size / 2, size / 2 + size * 0.09);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size]);

  // Keyboard controls
  useEffect(() => {
    const opposite: Record<Dir, Dir> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    };

    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ') {
        if (state.current === 'idle' || state.current === 'gameover') startGame();
        return;
      }

      if (state.current !== 'playing') return;

      const map: Record<string, Dir> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
      };
      const newDir = map[e.key];
      if (newDir && newDir !== opposite[dir.current]) {
        nextDir.current = newDir;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startGame]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const opposite: Record<Dir, Dir> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;

      // Tap (no significant swipe) — start/restart
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        if (state.current === 'idle' || state.current === 'gameover') startGame();
        touchStart.current = null;
        return;
      }

      if (state.current !== 'playing') {
        touchStart.current = null;
        return;
      }

      let newDir: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        newDir = dy > 0 ? 'DOWN' : 'UP';
      }

      if (newDir !== opposite[dir.current]) {
        nextDir.current = newDir;
      }
      touchStart.current = null;
    };

    const onClick = () => {
      if (state.current === 'idle' || state.current === 'gameover') startGame();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('click', onClick);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('click', onClick);
    };
  }, [startGame]);

  return (
    <div className={className} ref={containerRef}>
      {/* Score bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm text-slate-400">
          Score: <span className="text-white font-semibold">{score}</span>
        </span>
        <span className="text-sm text-slate-400">
          Best: <span className="text-cyan-400 font-semibold">{highScore}</span>
        </span>
      </div>

      {/* Canvas */}
      <div className="rounded-xl overflow-hidden border border-white/[0.08]">
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, display: 'block' }}
        />
      </div>

      {/* Mobile hint */}
      <p className="text-xs text-slate-500 text-center mt-2 md:hidden">
        Swipe to move, tap to start
      </p>
      <p className="text-xs text-slate-300 text-center mt-2 hidden md:block">
        Arrow keys to move. Space to start
      </p>
    </div>
  );
}
