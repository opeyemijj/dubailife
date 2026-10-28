"use client";

// Payday: when Friday's wages land (the first time you open the map or your home after), you're at a street
// ATM; the notes slide out, and you choose how much to put in your savings jar (nothing, 10%, 25% or half).
// Savings count toward the Save up goal; the jar is in the Wallet.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePathname } from "next/navigation";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { dubaiSky, SkyAndLight } from "@/components/transit/TransitWorld";
import { Building, Lamp, StreetPalm } from "@/components/home/RunJourney";
import { footstep } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { dialogOpen, useCitizen } from "@/lib/citizenStore";
import { MISSIONS, moveSavings, mySavings, seenPayday, type Savings } from "@/lib/missions";
import { gameAudio } from "@/utils/gameAudio";

function atmTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 192;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b3b37"; g.fillRect(0, 0, 256, 192);
  g.fillStyle = "#5eead4"; g.font = "900 30px sans-serif"; g.textAlign = "center"; g.fillText("PAYDAY", 128, 70);
  g.fillStyle = "#ffffff"; g.font = "700 20px sans-serif"; g.fillText("Wages received", 128, 110);
  g.fillText("Take cash or save", 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Street({ look }: { look?: AvatarLookProps }) {
  const sky = useMemo(() => dubaiSky(), []);
  const night = sky === "night";
  const screen = useMemo(() => atmTexture(), []);
  const me = useRef<THREE.Group>(null);
  const notes = useRef<THREE.Group>(null);
  const t = useRef(0);
  const stride = useRef(0);
  const [anim, setAnim] = useState<AvatarAnimation>("walk");
  useFrame(({ camera }, dt) => {
    t.current += dt;
    const k = Math.min(1, t.current / 2.4);
    if (me.current) {
      me.current.position.set(-4 + 4 * k, 0, 2.4 - 0.9 * k);
      me.current.rotation.y = k < 1 ? Math.PI / 2 : Math.PI;
      if (k < 1) { const b = Math.floor(stride.current); stride.current += dt * 1.9; if (Math.floor(stride.current) !== b) footstep("stone", 0.2); }
      else if (anim === "walk") setAnim("idle");
    }
    // The cash comes out of the slot, a note at a time.
    notes.current?.children.forEach((n, i) => {
      const s = Math.max(0, Math.min(1, (t.current - 2.8 - i * 0.25) / 0.5));
      n.position.set(0, 1.02 - i * 0.004, 0.08 + s * 0.22);
      n.visible = s > 0;
    });
    // Across the pavement: you, the ATM and the street together.
    camera.position.lerp(new THREE.Vector3(3.4, 2.4, 7), Math.min(1, dt * 2));
    camera.lookAt(-0.6, 1.0, 0.8);
  });
  return (
    <>
      <SkyAndLight sky={sky} />
      <ambientLight intensity={night ? 0.8 : 0.35} color={night ? "#c7d2fe" : "#fff"} />
      <mesh position={[0, 0, 5.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 6]} /><meshStandardMaterial color="#3f3f46" /></mesh>
      <mesh position={[0, 0.06, 1.4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[60, 5]} /><meshStandardMaterial color="#d6cdb8" /></mesh>
      <Building x={0} z={-4} w={12} d={8} h={14} color="#f1f5f9" facing={1} night={night} />
      {[-11, 11].map((x) => <Building key={x} x={x} z={-4} w={9} d={8} h={22} color="#e7e1d6" facing={1} night={night} />)}
      {[-6, 6].map((x) => <StreetPalm key={x} x={x} z={3.6} h={6} />)}
      {[-9, 9].map((x) => <Lamp key={x} x={x} z={3.8} night={night} />)}
      {/* the ATM, set into the wall */}
      <group position={[0, 0, 0.05]}>
        <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.9, 2.2, 0.35]} /><meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 1.55, 0.18]}><planeGeometry args={[0.6, 0.45]} /><meshStandardMaterial map={screen} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, 1.15, 0.2]} rotation={[-0.5, 0, 0]}><boxGeometry args={[0.45, 0.25, 0.04]} /><meshStandardMaterial color="#94a3b8" /></mesh>
        <mesh position={[0, 1.02, 0.18]}><boxGeometry args={[0.36, 0.03, 0.03]} /><meshStandardMaterial color="#0f172a" /></mesh>
        <mesh position={[0, 2.35, 0.1]}><boxGeometry args={[0.95, 0.25, 0.4]} /><meshStandardMaterial color="#0d9488" emissive="#14b8a6" emissiveIntensity={0.5} /></mesh>
        <pointLight position={[0, 2.2, 0.8]} intensity={6} distance={4} color="#ccfbf1" />
        <group ref={notes}>
          {[0, 1, 2, 3].map((i) => <mesh key={i} visible={false} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, 0.15]} /><meshStandardMaterial color="#86efac" side={THREE.DoubleSide} /></mesh>)}
        </group>
      </group>
      <group ref={me}><Suspense fallback={null}><CitizenAvatar look={look} animation={anim} /></Suspense></group>
    </>
  );
}

export function Payday() {
  const { citizen } = useCitizen();
  const path = usePathname() ?? "";
  const quality = useMemo(() => canvasQuality(), []);
  const [s, setS] = useState<Savings | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = citizen?.id;
  const here = /^\/(explore|home)\b/.test(path);

  useEffect(() => {
    if (!me || !here) return;
    let alive = true;
    const check = async () => {
      const r = await mySavings();
      if (!alive || !r) return;
      setS(r);
      if (r.payday && !r.payday.seen && !dialogOpen()) setShow(true);
    };
    const first = setTimeout(() => void check(), 5000);
    const every = setInterval(() => void check(), 60000);
    return () => { alive = false; clearTimeout(first); clearInterval(every); };
  }, [me, here]);

  if (!show || !s?.payday || !citizen) return null;
  const pay = s.payday;
  const choose = async (share: number) => {
    setBusy(true); setError(null);
    const amt = Math.floor((pay.amount * share) / 100);
    if (amt > 0) {
      const r = await moveSavings(amt);
      if (r.error) { setBusy(false); setError(r.error); return; }
      gameAudio.playCoinSound();
      setDone(`AED ${amt.toLocaleString()} saved. Your jar: AED ${(r.data ?? 0).toLocaleString()}.`);
    } else setDone("All of it's in your wallet. Spend wisely!");
    await seenPayday(pay.ref);
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-[203] bg-slate-900 text-white" role="dialog" aria-modal="true" aria-label="Payday">
      <Canvas dpr={quality.dpr} camera={{ position: [2.4, 2.0, 6], fov: 50 }} className="!absolute inset-0">
        <Street look={citizen.look} />
      </Canvas>
      <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto rounded-[26px] bg-white text-slate-900 p-4 space-y-3 shadow-2xl animate-[sheetUp_0.3s_ease-out]">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-700">It&apos;s payday</p>
              <p className="text-2xl font-black leading-tight">+AED {pay.amount.toLocaleString()}</p>
              <p className="text-xs text-slate-500 truncate">{pay.reason}</p>
            </div>
          </div>
          {done ? (
            <>
              <p className="text-sm font-bold text-emerald-700">{done}</p>
              <button onClick={() => setShow(false)} className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">Done</button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Put some in your savings jar? Savings count toward your Save up goal, and you can take them out any time in your Wallet.{s.amount ? ` Jar now: AED ${s.amount.toLocaleString()}.` : ""}</p>
              <div className="grid grid-cols-2 gap-2">
                {MISSIONS.savings.shares.map((sh) => (
                  <button key={sh} disabled={busy} onClick={() => choose(sh)} className={`h-12 rounded-2xl font-black text-sm disabled:opacity-60 ${sh ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                    {sh ? `Save ${sh}% · AED ${Math.floor((pay.amount * sh) / 100).toLocaleString()}` : "Keep it all"}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
