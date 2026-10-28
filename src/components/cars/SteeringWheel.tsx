"use client";

// An analog steering wheel for touch screens: put your thumb on it and turn, like the real thing. How far
// you turn it is how hard you steer (-1 full left .. 1 full right, at 135° of wheel); let go and it spins
// back to the centre. Used for your own car and in the Driving Academy test.

import { useEffect, useRef } from "react";

const LOCK = 135;

export function SteeringWheel({ onSteer, size = 136, className = "" }: { onSteer: (v: number) => void; size?: number; className?: string }) {
  const wheel = useRef<SVGSVGElement>(null);
  const state = useRef({ angle: 0, grab: null as null | { pointer: number; wheel: number }, raf: 0 });
  const onSteerRef = useRef(onSteer);
  useEffect(() => { onSteerRef.current = onSteer; }, [onSteer]);
  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  const show = (angle: number) => {
    state.current.angle = angle;
    if (wheel.current) wheel.current.style.transform = `rotate(${angle}deg)`;
    onSteerRef.current(Math.abs(angle) < 2 ? 0 : angle / LOCK);
  };
  /** The pointer's angle around the wheel's centre, in degrees (0 at the top, clockwise). */
  const pointerAngle = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
  };
  const release = () => {
    state.current.grab = null;
    // Self-centring: the wheel spins back to straight.
    let last = performance.now();
    const back = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const a = state.current.angle;
      const next = Math.abs(a) < 1.5 ? 0 : a - Math.sign(a) * Math.min(Math.abs(a), (120 + Math.abs(a) * 4) * dt);
      show(next);
      if (next !== 0 && !state.current.grab) state.current.raf = requestAnimationFrame(back);
    };
    cancelAnimationFrame(state.current.raf);
    state.current.raf = requestAnimationFrame(back);
  };

  return (
    <div
      aria-label="Steering wheel: turn it to steer"
      className={`relative touch-none select-none rounded-full ${className}`} style={{ width: size, height: size }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        cancelAnimationFrame(state.current.raf);
        state.current.grab = { pointer: pointerAngle(e), wheel: state.current.angle };
      }}
      onPointerMove={(e) => {
        const g = state.current.grab;
        if (!g) return;
        let d = pointerAngle(e) - g.pointer;
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        // Keep turning past the top: follow the hand round, re-anchoring each move.
        const a = Math.max(-LOCK, Math.min(LOCK, g.wheel + d));
        state.current.grab = { pointer: pointerAngle(e), wheel: a };
        show(a);
      }}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={() => { if (state.current.grab) release(); }}
    >
      <svg ref={wheel} viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]" style={{ transition: "none" }}>
        <defs>
          <radialGradient id="sw-rim" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#3f3f46" /><stop offset="100%" stopColor="#0a0a0a" /></radialGradient>
          <radialGradient id="sw-hub" cx="50%" cy="35%" r="65%"><stop offset="0%" stopColor="#52525b" /><stop offset="100%" stopColor="#18181b" /></radialGradient>
        </defs>
        {/* the rim, stitched leather with thumb grips */}
        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#sw-rim)" strokeWidth="10" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#71717a" strokeWidth="0.6" strokeDasharray="1.4 2.2" />
        {[-62, 62].map((a) => <path key={a} d="M50 6 a44 44 0 0 1 9 1" transform={`rotate(${a - 6} 50 50)`} stroke="#27272a" strokeWidth="12" fill="none" strokeLinecap="round" />)}
        {/* the top marker */}
        <rect x="47.5" y="1.5" width="5" height="9" rx="1.5" fill="#ef4444" />
        {/* three spokes and the hub */}
        <path d="M14 56 L38 52 L38 60 L16 64 Z" fill="#27272a" />
        <path d="M86 56 L62 52 L62 60 L84 64 Z" fill="#27272a" />
        <path d="M45 62 L55 62 L53 92 L47 92 Z" fill="#27272a" />
        <circle cx="50" cy="55" r="15" fill="url(#sw-hub)" stroke="#3f3f46" strokeWidth="1" />
        <text x="50" y="59" textAnchor="middle" fontSize="9" fontWeight="900" fill="#d4d4d8" fontFamily="sans-serif">DXB</text>
      </svg>
    </div>
  );
}
