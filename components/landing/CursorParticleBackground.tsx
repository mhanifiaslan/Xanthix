'use client';

import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 110;
const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#22d3ee', // cyan
  '#f472b6', // pink
  '#a78bfa', // light violet
  '#60a5fa', // sky
  '#fb923c', // orange (sparing)
];

interface Particle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
}

/**
 * Antigravity-inspired confetti dash field. Each particle drifts gently in
 * Brownian motion. The cursor casts a soft radial halo and pushes nearby
 * particles outward, then they relax back to their base position. Honors
 * prefers-reduced-motion by rendering a static field with no animation.
 */
export default function CursorParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        baseX: x,
        baseY: y,
        x,
        y,
        vx: 0,
        vy: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.004,
        size: 8 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const mouse = { x: -9999, y: -9999, active: false };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onMouseLeave = () => {
      mouse.active = false;
    };
    const onResize = () => {
      // Re-spread particles' base positions on resize so they don't bunch up.
      const oldW = width;
      const oldH = height;
      setSize();
      const sx = width / oldW;
      const sy = height / oldH;
      for (const p of particles) {
        p.baseX *= sx;
        p.baseY *= sy;
        p.x *= sx;
        p.y *= sy;
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', onResize);

    let raf = 0;

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-p.size / 2, 0);
      ctx.lineTo(p.size / 2, 0);
      ctx.stroke();
      ctx.restore();
    };

    const renderStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) drawParticle(p);
    };

    if (reduced) {
      renderStatic();
      // Still update on resize when reduced-motion is on.
      const onReducedResize = () => renderStatic();
      window.addEventListener('resize', onReducedResize);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseleave', onMouseLeave);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('resize', onReducedResize);
      };
    }

    const REPEL_RADIUS = 180;
    const REPEL_STRENGTH = 0.55;

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      // Cursor halo behind particles
      if (mouse.active) {
        const grad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          340,
        );
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
        grad.addColorStop(0.45, 'rgba(34, 211, 238, 0.06)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      for (const p of particles) {
        // Spring back to base
        const dxBase = p.baseX - p.x;
        const dyBase = p.baseY - p.y;
        p.vx += dxBase * 0.012;
        p.vy += dyBase * 0.012;

        // Brownian wobble
        p.vx += (Math.random() - 0.5) * 0.04;
        p.vy += (Math.random() - 0.5) * 0.04;

        // Cursor repulsion
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < REPEL_RADIUS * REPEL_RADIUS && dist2 > 0.01) {
            const dist = Math.sqrt(dist2);
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_STRENGTH;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Damping
        p.vx *= 0.92;
        p.vy *= 0.92;

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        drawParticle(p);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
