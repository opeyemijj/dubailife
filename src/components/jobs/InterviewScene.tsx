"use client";

// Getting a job, in 3D: you walk through the recruitment centre past the employers' booths and the people
// waiting, sit down across the desk from the interviewer, and answer their questions face to face (they
// react to each answer). Pass and they stand up, shake your hand and welcome you aboard; for a city company
// your phone rings straight after with the offer. The interview and the hiring are the same server calls as
// before (take_interview, then apply_job); only the way it's played has changed.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CitizenAvatar, type AvatarAnimation } from "@/components/avatar/CitizenAvatar";
import type { AvatarLookProps } from "@/components/onboarding/AvatarCanvas";
import { ModalPortal } from "@/components/ui/modal-portal";
import { footstep, phoneRing } from "@/components/transit/transitAudio";
import { canvasQuality } from "@/lib/device";
import { LOCALS } from "@/lib/locals";
import { applyJob, companyIcon, type BoardJob } from "@/lib/economy";
import { interviewFor, takeInterview } from "@/lib/cityServices";
import { monthlyPay } from "@/lib/goals";
import { gameAudio } from "@/utils/gameAudio";

type Stage = "arrive" | "ask" | "react" | "checking" | "passed" | "call" | "failed";
const BOOTHS = ["City Metro", "Gulf Hotels", "Dubai Health", "Swift Delivery", "Marina Mall Group", "Desert Tours", "Dubai Police", "Falcon Analytics"];
const CHAIR_Z = 1.25;

function signTexture(icon: string, name: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = color; g.fillRect(0, 0, 512, 160);
  g.fillStyle = "#ffffff"; g.textAlign = "left"; g.textBaseline = "middle";
  g.font = "90px sans-serif"; g.fillText(icon, 22, 84);
  g.font = "900 46px sans-serif"; g.fillText(name.length > 16 ? `${name.slice(0, 15)}…` : name, 130, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One employer's booth: a desk, a sign above it and a chair for the candidate. */
function Booth({ name, x, mine }: { name: string; x: number; mine: boolean }) {
  const tex = useMemo(() => signTexture(companyIcon(name) ?? "💼", name, mine ? "#0f766e" : "#334155"), [name, mine]);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.38, 0]}><boxGeometry args={[2.2, 0.76, 0.9]} /><meshStandardMaterial color="#f1f5f9" roughness={0.5} /></mesh>
      <mesh position={[0, 0.78, 0]}><boxGeometry args={[2.3, 0.05, 1]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
      {/* a laptop and a folder on the desk */}
      <mesh position={[0.85, 0.92, -0.15]} rotation={[-0.3, -0.5, 0]}><boxGeometry args={[0.45, 0.3, 0.02]} /><meshStandardMaterial color="#1e293b" metalness={0.5} /></mesh>
      <mesh position={[-0.45, 0.82, 0.15]}><boxGeometry args={[0.32, 0.03, 0.42]} /><meshStandardMaterial color="#0ea5e9" /></mesh>
      <mesh position={[0, 2.55, -1.6]}><planeGeometry args={[2.4, 0.75]} /><meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} /></mesh>
      {/* the candidate's chair and the interviewer's */}
      {[CHAIR_Z, -0.95].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.5, 0.08, 0.5]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, 0.75, z > 0 ? 0.24 : -0.24]}><boxGeometry args={[0.5, 0.55, 0.06]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.04, 0.04, 0.44, 8]} /><meshStandardMaterial color="#64748b" metalness={0.7} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Hall({ company }: { company: string }) {
  const others = BOOTHS.filter((b) => b !== company).slice(0, 4);
  const wall = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b3b37"; g.fillRect(0, 0, 1024, 128);
    g.fillStyle = "#ffffff"; g.font = "900 56px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("DUBAI JOB BOARD · RECRUITMENT CENTRE", 512, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 24]} /><meshStandardMaterial color="#e7e5e4" roughness={0.35} metalness={0.1} /></mesh>
      <mesh position={[0, 2.5, -2.4]}><planeGeometry args={[30, 5]} /><meshStandardMaterial color="#f8fafc" /></mesh>
      <mesh position={[0, 4.2, -2.38]}><planeGeometry args={[11, 1.4]} /><meshStandardMaterial map={wall} /></mesh>
      {[-15, 15].map((x) => <mesh key={x} position={[x, 2.5, 6]} rotation={[0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}><planeGeometry args={[18, 5]} /><meshStandardMaterial color="#f1f5f9" /></mesh>)}
      <Booth name={company} x={0} mine />
      {others.map((n, i) => <Booth key={n} name={n} x={(i < 2 ? -1 : 1) * (3.2 + (i % 2) * 3.2)} mine={false} />)}
      {/* the other interviewers at their desks, and people waiting on the bench */}
      {others.map((n, i) => (
        <group key={n} position={[(i < 2 ? -1 : 1) * (3.2 + (i % 2) * 3.2), 0, -0.95]}>
          <Suspense fallback={null}><CitizenAvatar look={LOCALS[(i * 7 + 3) % LOCALS.length].look} animation="sit" /></Suspense>
        </group>
      ))}
      <mesh position={[-6, 0.24, 5.2]}><boxGeometry args={[4, 0.48, 0.6]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[-7.2 + i * 1.2, 0, 5.2]}>
          <Suspense fallback={null}><CitizenAvatar look={LOCALS[(i * 11 + 5) % LOCALS.length].look} animation={i === 1 ? "talk" : "sit"} /></Suspense>
        </group>
      ))}
      {/* plants and light */}
      {[-11, 11].map((x) => (
        <group key={x} position={[x, 0, -1.6]}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.35, 0.28, 0.6, 12]} /><meshStandardMaterial color="#57534e" /></mesh>
          <mesh position={[0, 1.2, 0]}><sphereGeometry args={[0.6, 12, 10]} /><meshStandardMaterial color="#3f7d3a" /></mesh>
        </group>
      ))}
      <hemisphereLight args={["#ffffff", "#d6d3d1", 1.1]} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} />
      <pointLight position={[0, 3.2, 0.5]} intensity={18} distance={8} color="#fff4e0" />
    </>
  );
}

function Scene({ company, look, stage, interviewerAnim, onSeated }: {
  company: string; look?: AvatarLookProps; stage: Stage; interviewerAnim: AvatarAnimation; onSeated: () => void;
}) {
  const me = useRef<THREE.Group>(null);
  const boss = useRef<THREE.Group>(null);
  const t = useRef(0);
  const seated = useRef(false);
  const stride = useRef(0);
  const target = useRef(new THREE.Vector3(0, 1.1, -1));
  const [myAnim, setMyAnim] = useState<AvatarAnimation>("walk");
  const [bossSit, setBossSit] = useState(true);
  const interviewer = useMemo(() => LOCALS[(company.length * 13) % LOCALS.length].look, [company]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    t.current += dt;
    const g = me.current;
    if (!g) return;
    const standing = stage === "passed" || stage === "call";
    if (stage === "arrive") {
      // In through the door and up to the booth.
      const k = Math.min(1, t.current / 3.6);
      g.position.set(0.9 * (1 - k), 0, 9 - (9 - CHAIR_Z - 0.1) * k);
      g.rotation.y = Math.PI;
      const before = Math.floor(stride.current); stride.current += dt * 1.9;
      if (Math.floor(stride.current) !== before) footstep("stone", 0.25);
      if (k >= 1 && !seated.current) { seated.current = true; setMyAnim("sit"); onSeated(); }
    } else if (standing) {
      // Stand up and step to the desk for the handshake.
      if (myAnim !== "idle" && stage === "passed") { setMyAnim("idle"); setBossSit(false); }
      g.position.lerp(new THREE.Vector3(0, 0, 0.75), Math.min(1, dt * 2));
    } else g.position.set(0, 0, CHAIR_Z);
    if (boss.current) boss.current.position.set(0, 0, bossSit ? -0.95 : -0.6);
    // The camera: following you in, then over your shoulder across the desk.
    const p = g.position;
    const cam = stage === "arrive" ? new THREE.Vector3(p.x + 1.4, 2.4, p.z + 3.6)
      : standing ? new THREE.Vector3(2.6, 1.8, 2.4) : new THREE.Vector3(0.75, 1.55, 2.75);
    target.current.lerp(stage === "arrive" ? new THREE.Vector3(p.x, 1.2, p.z - 3) : standing ? new THREE.Vector3(0, 1.3, 0) : new THREE.Vector3(-0.1, 1.05, -0.9), Math.min(1, dt * 3));
    camera.position.lerp(cam, Math.min(1, dt * (stage === "arrive" ? 4 : 2)));
    camera.lookAt(target.current);
  });

  return (
    <>
      <color attach="background" args={["#e2e8f0"]} />
      <Hall company={company} />
      <group ref={boss} position={[0, 0, -0.95]}>
        <Suspense fallback={null}><CitizenAvatar look={interviewer} animation={bossSit ? "sit" : interviewerAnim} /></Suspense>
      </group>
      <group ref={me} rotation={[0, Math.PI, 0]}>
        <Suspense fallback={null}><CitizenAvatar look={look} animation={myAnim} /></Suspense>
      </group>
    </>
  );
}

export function InterviewScene({ job, look, onDone }: { job: BoardJob; look?: AvatarLookProps; onDone: (hired: boolean) => void }) {
  const quality = useMemo(() => canvasQuality(), []);
  const questions = useMemo(() => interviewFor(job.venture, job.system), [job]);
  const [stage, setStage] = useState<Stage>("arrive");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [say, setSay] = useState<string>("");
  const [result, setResult] = useState<{ score: number; error?: string } | null>(null);
  const [bossAnim, setBossAnim] = useState<AvatarAnimation>("idle");

  useEffect(() => { if (stage === "call") { phoneRing(); const t = setInterval(phoneRing, 1800); return () => clearInterval(t); } }, [stage]);

  const answer = async (n: number) => {
    gameAudio.playClickSound();
    const next = [...answers, n];
    setAnswers(next);
    const right = questions[i].answer === n;
    setStage("react");
    setBossAnim(right ? "clap" : "idle");
    setSay(right ? ["Good answer.", "Exactly right.", "I like that."][i % 3] : ["Hmm, not quite.", "I'd have done it differently.", "Okay…"][i % 3]);
    await new Promise((r) => setTimeout(r, 1500));
    setBossAnim("idle");
    if (i + 1 < questions.length) { setI(i + 1); setStage("ask"); setSay(questions[i + 1].q); return; }
    setStage("checking"); setSay("Thank you. Give me a moment…");
    const r = await takeInterview(job.id, next);
    if (r.error || !r.data) { setResult({ score: 0, error: r.error }); setStage("failed"); setSay(r.error ?? "Something went wrong. Try again."); return; }
    if (!r.data.passed) { setResult({ score: r.data.score }); setStage("failed"); setSay(`${r.data.score} out of ${questions.length}. Thanks for coming in. Try again tomorrow.`); return; }
    const a = await applyJob(job.id);
    if (a.error) { setResult({ score: r.data.score, error: a.error }); setStage("failed"); setSay(a.error); return; }
    gameAudio.playCoinSound();
    setResult({ score: r.data.score });
    setBossAnim("wave");
    setStage("passed");
    setSay(job.system ? `Welcome to ${job.venture}! You start tomorrow.` : `Great interview. The ${job.venture} crew will review your application.`);
    // A city company calls with the offer straight away.
    if (job.system) setTimeout(() => setStage("call"), 2600);
  };

  const q = questions[i];
  const pay = monthlyPay(job.weeklyWage);
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] bg-slate-200 select-none" role="dialog" aria-modal="true" aria-label={`Interview at ${job.venture}`}>
        <Canvas dpr={quality.dpr} camera={{ position: [1.4, 2.4, 12], fov: 50, near: 0.1, far: 120 }}>
          <Scene company={job.venture} look={look} stage={stage} interviewerAnim={bossAnim}
            onSeated={() => { setStage("ask"); setSay(questions[0].q); }} />
        </Canvas>

        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 pointer-events-none">
          <div className="max-w-md mx-auto bg-white/95 text-slate-900 rounded-[22px] shadow-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-2xl">{companyIcon(job.venture) ?? "💼"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-black leading-tight truncate">Interview · {job.title}</p>
              <p className="text-xs text-slate-500 truncate">{job.venture} · AED {pay.toLocaleString()} a month</p>
            </div>
            {(stage === "ask" || stage === "react") && <p className="text-xs font-black text-slate-500">{i + 1}/{questions.length}</p>}
          </div>
        </div>

        {/* what the interviewer says */}
        {say && stage !== "call" && (
          <div className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+4.5rem)] inset-x-3 flex justify-center pointer-events-none">
            <p className={`max-w-sm rounded-2xl px-4 py-2.5 font-semibold shadow-xl ${stage === "react" && bossAnim === "clap" ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}>💬 {say}</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto space-y-2">
            {stage === "arrive" && <p className="text-center text-sm font-bold text-slate-700 bg-white/80 rounded-full py-2">Walking to the {job.venture} desk…</p>}
            {stage === "ask" && q.options.map((o, n) => (
              <button key={n} onClick={() => answer(n)} className="w-full text-left rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 shadow-lg active:scale-[0.98]">{o}</button>
            ))}
            {stage === "checking" && <p className="text-center text-sm font-bold text-slate-700 bg-white/80 rounded-full py-2">The interviewer is writing notes…</p>}
            {stage === "passed" && !job.system && <button onClick={() => onDone(false)} className="w-full h-12 rounded-2xl bg-teal-600 text-white font-black">Done</button>}
            {stage === "failed" && (
              <div className="rounded-3xl bg-white p-4 space-y-2 text-slate-900">
                <p className="font-black">{result?.error ? "Couldn't finish the interview" : "Not this time"}</p>
                <p className="text-sm text-slate-600">{result?.error ?? "You need 2 of 3 right. You can try this job again tomorrow, or try another employer today."}</p>
                <button onClick={() => onDone(false)} className="w-full h-11 rounded-2xl bg-slate-900 text-white font-black">Back to the Job Board</button>
              </div>
            )}
            {stage === "call" && (
              <div className="rounded-[28px] bg-slate-900 text-white p-5 space-y-3 shadow-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-2xl animate-pulse">📞</span>
                  <div><p className="text-xs text-white/60">Incoming call</p><p className="font-black text-lg">{job.venture} HR</p></div>
                </div>
                <p className="text-sm text-white/85">“Congratulations! You&apos;re our new <b>{job.title}</b>. AED {pay.toLocaleString()} a month, paid every Friday. Your first shift is ready when you are.”</p>
                <button onClick={() => onDone(true)} className="w-full h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black">Accept the offer</button>
              </div>
            )}
          </div>
        </div>
        {stage !== "call" && stage !== "failed" && !(stage === "passed" && !job.system) && (
          <button onClick={() => onDone(false)} className="absolute top-[calc(max(0.75rem,env(safe-area-inset-top))+0.6rem)] right-5 w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-black text-sm" aria-label="Leave the interview">✕</button>
        )}
      </div>
    </ModalPortal>
  );
}
