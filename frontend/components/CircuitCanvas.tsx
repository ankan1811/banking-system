'use client';

import { useEffect, useRef } from 'react';

interface CircuitCanvasProps {
  serverReady: boolean;
  elapsed: number;
}

type FlashPhase = 'none' | 'rising' | 'falling';

interface Trace {
  x1: number; y1: number;
  x2: number; y2: number;
  lit: boolean;
  litProgress: number;
  litAtSecond: number;
}

interface Node {
  x: number; y: number;
  glowRadius: number;
  pulsePhase: number;
  lit: boolean;
}

interface Packet {
  traceIndex: number;
  progress: number;
  speed: number;
  active: boolean;
}

interface BurstParticle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: string;
}

function buildCircuit(W: number, H: number): { traces: Trace[]; nodes: Node[] } {
  const cols = Math.floor(W / 120) + 1;
  const rows = Math.floor(H / 90) + 1;

  const pts: { x: number; y: number }[][] = [];
  for (let r = 0; r < rows; r++) {
    pts[r] = [];
    for (let c = 0; c < cols; c++) {
      pts[r][c] = {
        x: (c * (W / Math.max(cols - 1, 1))) + (Math.random() - 0.5) * 20,
        y: (r * (H / Math.max(rows - 1, 1))) + (Math.random() - 0.5) * 20,
      };
    }
  }

  const traces: Trace[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      traces.push({
        x1: pts[r][c].x, y1: pts[r][c].y,
        x2: pts[r][c + 1].x, y2: pts[r][c + 1].y,
        lit: false, litProgress: 0,
        litAtSecond: Math.floor(Math.random() * 80),
      });
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      traces.push({
        x1: pts[r][c].x, y1: pts[r][c].y,
        x2: pts[r + 1][c].x, y2: pts[r + 1][c].y,
        lit: false, litProgress: 0,
        litAtSecond: Math.floor(Math.random() * 80),
      });
    }
  }

  const nodes: Node[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      nodes.push({
        x: pts[r][c].x,
        y: pts[r][c].y,
        glowRadius: 3 + Math.random() * 4,
        pulsePhase: Math.random() * Math.PI * 2,
        lit: false,
      });
    }
  }

  return { traces, nodes };
}

function spawnPacket(traces: Trace[]): Packet {
  const litTraces = traces.filter(t => t.lit);
  const pool = litTraces.length > 3
    ? [...litTraces, ...litTraces, ...traces]
    : traces;
  const t = pool[Math.floor(Math.random() * pool.length)];
  const idx = traces.indexOf(t);
  return {
    traceIndex: Math.max(0, idx),
    progress: 0,
    speed: 0.004 + Math.random() * 0.006,
    active: true,
  };
}

export default function CircuitCanvas({ serverReady, elapsed }: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serverReadyRef = useRef(serverReady);
  const elapsedRef = useRef(elapsed);
  const mouseRef = useRef({ x: -999, y: -999 });

  useEffect(() => { serverReadyRef.current = serverReady; }, [serverReady]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // Track mouse for node proximity
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Main canvas RAF loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const { traces, nodes } = buildCircuit(W, H);
    const packets: Packet[] = Array.from({ length: 8 }, () => spawnPacket(traces));

    let flashAlpha = 0;
    let flashPhase: FlashPhase = 'none';
    let burstParticles: BurstParticle[] = [];
    let frameCount = 0;
    let cancelled = false;
    let rafId: number;

    const COLORS = {
      traceDim:   '#2d1f5e',
      traceLit:   '#5b3ea0',
      node:       '#6d4faa',
      packet:     '#22d3ee',
      nodeReady:  '#10b981',
      traceReady: '#10b981',
    };

    const draw = () => {
      if (cancelled) return;
      frameCount++;

      // Advance packets
      for (const pkt of packets) {
        if (!pkt.active) continue;
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          Object.assign(pkt, spawnPacket(traces));
        }
      }

      // Handle server-ready flash/burst
      if (serverReadyRef.current) {
        if (flashPhase === 'none') {
          flashPhase = 'rising';
          traces.forEach(tr => { tr.lit = true; tr.litProgress = 1; });
          nodes.forEach(n => { n.lit = true; });
          const cx = W / 2, cy = H / 2;
          burstParticles = Array.from({ length: 40 }, () => ({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            alpha: 1,
            color: Math.random() > 0.5 ? '#10b981' : '#22d3ee',
          }));
        }
        if (flashPhase === 'rising') {
          flashAlpha = Math.min(1, flashAlpha + 0.05);
          if (flashAlpha >= 1) flashPhase = 'falling';
        } else if (flashPhase === 'falling') {
          flashAlpha = Math.max(0, flashAlpha - 0.02);
        }
        burstParticles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.97; p.vy *= 0.97;
          p.alpha -= 0.018;
        });
        burstParticles = burstParticles.filter(p => p.alpha > 0);
      }

      // Progressive trace lighting
      const elapsedSec = elapsedRef.current;
      for (const tr of traces) {
        if (!tr.lit && elapsedSec >= tr.litAtSecond) tr.lit = true;
        if (tr.lit && tr.litProgress < 1) {
          tr.litProgress = Math.min(1, tr.litProgress + 0.015);
        }
      }

      ctx.clearRect(0, 0, W, H);

      const isReady = serverReadyRef.current;

      // Draw traces
      for (const tr of traces) {
        ctx.save();
        ctx.strokeStyle = isReady ? COLORS.traceReady : (tr.lit ? COLORS.traceLit : COLORS.traceDim);
        ctx.lineWidth = 1;
        ctx.globalAlpha = tr.lit
          ? (0.25 + tr.litProgress * 0.45)
          : 0.12;
        if (isReady && flashPhase !== 'none') {
          ctx.globalAlpha = Math.max(ctx.globalAlpha, flashAlpha * 0.9);
          ctx.shadowColor = COLORS.traceReady;
          ctx.shadowBlur = 8 * flashAlpha;
        } else if (tr.lit) {
          ctx.shadowColor = COLORS.traceLit;
          ctx.shadowBlur = 4 * tr.litProgress;
        }
        ctx.beginPath();
        ctx.moveTo(tr.x1, tr.y1);
        ctx.lineTo(tr.x2, tr.y2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw nodes
      const now = frameCount / 60;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const nd of nodes) {
        const dist = Math.hypot(nd.x - mx, nd.y - my);
        const proxFactor = Math.max(0, 1 - dist / 180);
        const pulse = 0.5 + 0.5 * Math.sin(now * 1.5 + nd.pulsePhase);

        ctx.save();
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.glowRadius * (isReady ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = isReady ? COLORS.nodeReady : COLORS.node;
        ctx.globalAlpha = isReady
          ? (0.7 + flashAlpha * 0.3)
          : (0.2 + pulse * 0.25 + proxFactor * 0.5);
        ctx.shadowColor = isReady ? COLORS.nodeReady : COLORS.node;
        ctx.shadowBlur = nd.glowRadius * (2 + proxFactor * 6 + (isReady ? flashAlpha * 8 : 0));
        ctx.fill();
        ctx.restore();
      }

      // Draw data packets
      for (const pkt of packets) {
        if (!pkt.active) continue;
        const tr = traces[pkt.traceIndex];
        if (!tr) continue;
        const px = tr.x1 + (tr.x2 - tr.x1) * pkt.progress;
        const py = tr.y1 + (tr.y2 - tr.y1) * pkt.progress;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.packet;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = COLORS.packet;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }

      // Draw burst particles
      for (const p of burstParticles) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    const onResize = () => {
      const newDpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * newDpr;
      canvas.height = window.innerHeight * newDpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(newDpr, newDpr);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
