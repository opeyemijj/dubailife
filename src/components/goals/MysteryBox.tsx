"use client";

// The daily mystery box, in 3D: a wrapped luxury vault on a pedestal under a spotlight, surrounded by
// a spinning 3D ring of Dubai jackpot prizes (near-miss psychology). Tap it and the lid flies off,
// gold coins burst out, and the prize + near-miss comparison show.

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { canvasQuality } from "@/lib/device";
import { ModalPortal } from "@/components/ui/modal-portal";
import { MISSIONS } from "@/lib/missions";
import { gameAudio } from "@/utils/gameAudio";

function Box({ openRef }: { openRef: React.RefObject<number> }) {
  const lid = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const coins = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Group>(null);
  // A fixed spread for the coins (the same burst every time).
  const bits = useMemo(() => Array.from({ length: 32 }, (_, i) => {
    const h = (k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    return { v: new THREE.Vector3((h(1) - 0.5) * 5.5, 5 + h(2) * 4.5, (h(3) - 0.5) * 3.5), spin: h(4) * 10 };
  }), []);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    const k = openRef.current;
    // Waiting: a little wobble and a slow turn. Opened: the lid flies up and away, coins burst.
    if (body.current) body.current.rotation.y = k ? body.current.rotation.y : t.current * 0.55;
    if (body.current && !k) body.current.rotation.z = Math.sin(t.current * 6) * 0.035 * (Math.sin(t.current * 1.3) > 0.6 ? 1 : 0);
    if (halo.current) {
      halo.current.rotation.y = -t.current * (k ? 2.4 : 0.9);
    }
    if (lid.current && k) {
      const e = Math.min(1, k);
      lid.current.position.set(e * 1.2, 1.15 + e * 3, -e * 0.5);
      lid.current.rotation.set(-e * 2, 0, e * 1.4);
      openRef.current = k + dt * 0.9;
    }
    coins.current?.children.forEach((c, i) => {
      const b = bits[i];
      if (!k) { c.visible = false; return; }
      const s = Math.min(k, 2.4);
      c.visible = true;
      c.position.set(b.v.x * s * 0.6, 1 + b.v.y * s - 4.9 * s * s, b.v.z * s * 0.6);
      c.rotation.set(b.spin * s, b.spin * s * 0.5, 0);
    });
  });
  return (
    <group>
      <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[1.6, 1.8, 0.5, 40]} /><meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.4} /></mesh>
      {/* Orbiting 3D Gold Bullion Bars around the Vault */}
      <group ref={halo} position={[0, 0.7, 0]}>
        {Array.from({ length: 6 }, (_, i) => {
          const ang = (i * Math.PI * 2) / 6;
          return (
            <mesh key={i} position={[Math.cos(ang) * 2.15, Math.sin(ang * 2) * 0.15, Math.sin(ang) * 2.15]} rotation={[0.4, ang, 0.2]}>
              <boxGeometry args={[0.32, 0.14, 0.18]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.15} emissive="#d97706" emissiveIntensity={0.35} />
            </mesh>
          );
        })}
      </group>
      <group ref={body}>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[1.5, 1.1, 1.5]} /><meshStandardMaterial color="#7c3aed" roughness={0.35} /></mesh>
        {[0, Math.PI / 2].map((r) => <mesh key={r} position={[0, 0.55, 0]} rotation={[0, r, 0]}><boxGeometry args={[1.52, 1.12, 0.22]} /><meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.25} /></mesh>)}
        <group ref={lid} position={[0, 1.15, 0]}>
          <mesh><boxGeometry args={[1.65, 0.25, 1.65]} /><meshStandardMaterial color="#8b5cf6" roughness={0.35} /></mesh>
          {[0, Math.PI / 2].map((r) => <mesh key={r} rotation={[0, r, 0]}><boxGeometry args={[1.67, 0.27, 0.22]} /><meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.25} /></mesh>)}
          {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.3, 0]} rotation={[0, 0, x > 0 ? -0.6 : 0.6]}><torusGeometry args={[0.25, 0.07, 8, 16]} /><meshStandardMaterial color="#facc15" metalness={0.6} roughness={0.25} /></mesh>)}
        </group>
      </group>
      <group ref={coins}>
        {bits.map((_, i) => <mesh key={i} visible={false}><cylinderGeometry args={[0.16, 0.16, 0.04, 16]} /><meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} emissive="#b45309" emissiveIntensity={0.3} /></mesh>)}
      </group>
    </group>
  );
}

export function MysteryBox({ prize, xp, onDone }: { prize: number; xp: number; onDone: () => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const open = useRef(0);
  const [opened, setOpened] = useState(false);
  const tap = () => { if (opened) return; open.current = 0.001; setOpened(true); gameAudio.playCoinSound(); };

  // Build a visual 5-slot Luxury Reel with the winning prize in the center and high-value jackpots right beside it
  const reel = useMemo(() => {
    const tiers = MISSIONS.box.odds.map((o) => o.aed).sort((a, b) => a - b);
    const maxTier = tiers[tiers.length - 1] ?? 5000;
    const secondTier = tiers[Math.max(0, tiers.length - 2)] ?? 1500;
    return [
      { label: `AED ${secondTier.toLocaleString()}`, icon: "💎", win: false },
      { label: `AED ${maxTier.toLocaleString()}`, icon: "👑", win: false, nearMiss: prize < maxTier },
      { label: `AED ${prize.toLocaleString()}`, icon: "🎉", win: true },
      { label: `AED ${maxTier.toLocaleString()}`, icon: "🏎️", win: false, nearMiss: prize < maxTier },
      { label: `AED ${(tiers[1] ?? 500).toLocaleString()}`, icon: "✨", win: false },
    ];
  }, [prize]);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[206] bg-slate-950 text-white select-none" role="dialog" aria-modal="true" aria-label="Daily mystery box">
        <Canvas dpr={quality.dpr} camera={{ position: [0, 3.6, 8.5], fov: 45 }} onClick={tap} className="!absolute inset-0">
          <color attach="background" args={["#0f0a1f"]} />
          <ambientLight intensity={0.4} />
          <spotLight position={[0, 7, 3]} angle={0.5} penumbra={0.6} intensity={120} color="#fff1c2" />
          <pointLight position={[-3, 2, 2]} intensity={10} color="#a78bfa" />
          <Box openRef={open} />
        </Canvas>
        <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] inset-x-0 text-center pointer-events-none px-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-300">Daily Dubai Luxury Vault</p>
          <p className="text-2xl font-black">{opened ? "🎉 Vault Unlocked!" : "All 3 Daily Missions Complete!"}</p>
          {opened && (
            <>
              <p className="text-5xl font-black text-amber-300 mt-1.5 animate-[sheetUp_0.35s_ease-out]">
                AED {prize.toLocaleString()}
              </p>
              <p className="text-sm font-bold text-violet-200 mt-0.5">+{xp} XP · Come back tomorrow for another spin!</p>
            </>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          {opened && (
            <div className="max-w-md mx-auto">
              <div className="grid grid-cols-5 gap-1.5 items-center">
                {reel.map((slot, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-2 text-center border transition-all ${
                      slot.win
                        ? "bg-amber-400 text-slate-950 border-white scale-105 shadow-[0_0_24px_rgba(251,191,36,0.6)] font-black"
                        : slot.nearMiss
                        ? "bg-white/10 border-amber-400/40 text-amber-200/80 opacity-85"
                        : "bg-white/5 border-white/10 text-white/40 opacity-60"
                    }`}
                  >
                    <div className="text-lg leading-none">{slot.icon}</div>
                    <div className="text-[10px] font-black mt-1 truncate">{slot.label}</div>
                    {slot.nearMiss && <div className="text-[8px] uppercase font-bold text-amber-300">So close!</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-center text-[11px] text-white/50">
            Odds: {MISSIONS.box.odds.map((o) => `AED ${o.aed.toLocaleString()} ${o.chance}%`).join(" · ")}
          </p>
          {opened ? (
            <button onClick={onDone} className="w-full max-w-md mx-auto block h-12 rounded-2xl bg-amber-400 text-slate-950 font-black">
              Collect AED {prize.toLocaleString()}
            </button>
          ) : (
            <button onClick={tap} className="w-full max-w-md mx-auto block h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black animate-pulse">
              Tap Vault to Unlock 🔓
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
