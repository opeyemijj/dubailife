"use client";

// Cars on the phone: your license, the cars you own (plate, insurance, registration, fuel, and the impound
// if the police took it) and your rental, and every rental company and dealership on Sheikh Zayed Road.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCitizen } from "@/lib/citizenStore";
import { useNow } from "@/lib/dubaiClock";
import { aed, carOf, CARS, myFines, releaseCar, reportStolenCar, shopOf, useGarage, type Fine } from "@/lib/cars";
import { AppScreen, Card } from "./AppScreen";

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function CarsApp({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const router = useRouter();
  const { citizen } = useCitizen();
  const { garage, reload } = useGarage(citizen?.id);
  const now = useNow();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fines, setFines] = useState<Fine[]>([]);
  useEffect(() => { if (citizen?.id) void myFines().then((r) => setFines(r.data ?? [])); }, [citizen?.id]);
  const release = async (id: number) => {
    setBusy(id); setError(null);
    const r = await releaseCar(id);
    setBusy(null);
    if (r.error) setError(r.error); else void reload();
  };
  // To a showroom: on the map with its journey planner open, so you travel there first.
  const visit = (id: string) => { onClose(); router.push(`/explore?open=${id}`); };

  return (
    <AppScreen title="My Car" onBack={onBack} accent="text-slate-700">
      {!garage ? <p className="text-center text-slate-500 py-8">Loading…</p> : (
        <>
          {garage.licence ? (
            <Card className="bg-gradient-to-br from-sky-600 to-indigo-700 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Dubai Life · Driving license</p>
              <p className="text-2xl font-black tracking-wider">{garage.licence.number}</p>
              <p className="text-sm text-white/80">Issued {date(garage.licence.issuedAt)}</p>
              <p className={`text-xs font-bold ${(garage.accidents ?? 0) >= CARS.driving.revokeAfterAccidents - 1 ? "text-amber-200" : "text-white/70"}`}>
                Accidents: {garage.accidents ?? 0} of {CARS.driving.revokeAfterAccidents}. The {CARS.driving.revokeAfterAccidents === 3 ? "third" : `${CARS.driving.revokeAfterAccidents}th`} revokes your license.
              </p>
            </Card>
          ) : (
            garage.revokedAt ? (
              <Card className="bg-rose-50">
                <p className="font-black">🚫 Driving license revoked</p>
                <p className="text-sm text-slate-600">Revoked on {date(garage.revokedAt)} after {CARS.driving.revokeAfterAccidents} traffic accidents. Pass the theory exam and the Smart Yard again at the Driving Academy for a new one.</p>
                <button onClick={() => { onClose(); router.push("/driving"); }} className="w-full h-12 rounded-full bg-rose-600 text-white font-black">Go to the Driving Academy</button>
              </Card>
            ) : (
            <Card className="bg-amber-50">
              <p className="font-black">🪪 No driving license yet</p>
              <p className="text-sm text-slate-600">Pass the Driving Academy test to rent or buy a car.</p>
              <button onClick={() => { onClose(); router.push("/driving"); }} className="w-full h-12 rounded-full bg-amber-500 text-white font-black">Go to the Driving Academy</button>
            </Card>
            )
          )}

          {garage.owned.map((o) => {
            const c = carOf(o.car);
            const impounded = !!o.impoundedUntil && Date.parse(o.impoundedUntil) > now;
            return (
              <Card key={o.id} className={impounded ? "bg-rose-50" : undefined}>
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: c?.color ?? "#e5e7eb" }}>🚗</span>
                  <div className="flex-1 min-w-0"><p className="font-black truncate">{c?.make} {c?.model}</p><p className="text-sm text-slate-500">Plate {o.plate} · bought for {aed(o.price)}</p></div>
                </div>
                <FuelBar fuel={Number(o.fuel)} electric={!!c?.electric} />
                <p className="text-xs text-slate-500">Insured and registered until {date(o.insuredUntil)}</p>

                {o.isStolen ? (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                      <span className="text-xs font-black text-rose-900">
                        {o.reportedStolenAt ? "🚨 Reported Stolen · Dubai Police APB Active" : "⚠️ VEHICLE STOLEN · Hotwired from Driveway!"}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-rose-800">
                      {o.stolenByUsername ? `Taken by @${o.stolenByUsername}` : "Taken by an unknown suspect"}
                      {o.reportedStolenAt ? " · Live GPS tracked via RTA Salik gates" : " · Not yet reported to police"}
                    </p>
                    {!o.reportedStolenAt ? (
                      <button
                        onClick={async () => {
                          setBusy(o.id);
                          const r = await reportStolenCar(o.id);
                          setBusy(null);
                          if (!r.error) {
                            window.dispatchEvent(new CustomEvent("dubai:toast", {
                              detail: "🚨 Report Filed! Dubai Police APB issued across all highway patrols."
                            }));
                            void reload();
                          }
                        }}
                        disabled={busy === o.id}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md active:scale-95 disabled:opacity-60 transition-all"
                      >
                        {busy === o.id ? "Filing Police Report…" : "🚨 File Stolen Vehicle Report (Issue Police APB)"}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] font-bold text-sky-900 bg-sky-50 px-2.5 py-1.5 rounded-xl border border-sky-200">
                        <span>📡 Live GPS: Active on Sheikh Zayed Road</span>
                        <span className="text-sky-600 animate-pulse font-mono">Scanning…</span>
                      </div>
                    )}
                  </div>
                ) : o.recoveredAt ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold mt-2 flex items-center justify-between">
                    <span>✅ Recovered by Dubai Police · Safely back in driveway</span>
                    <span className="text-[10px] text-emerald-700">Tank refilled</span>
                  </div>
                ) : null}

                {impounded && (
                  <>
                    <p className="text-sm font-bold text-rose-700">🚔 In the police impound until {date(o.impoundedUntil!)}, after an accident.</p>
                    <button onClick={() => release(o.id)} disabled={busy === o.id} className="w-full h-11 rounded-full bg-rose-600 text-white font-black disabled:opacity-60">
                      {busy === o.id ? "Paying…" : `Release it now · ${aed(CARS.driving.releaseFee)}`}
                    </button>
                  </>
                )}
              </Card>
            );
          })}
          {error && <p className="text-sm font-bold text-rose-600 px-1">{error}</p>}
          {garage.rental && (() => {
            const c = carOf(garage.rental.car);
            return (
              <Card className="bg-emerald-50">
                <p className="font-black">🔑 Renting a {c?.make} {c?.model}</p>
                <p className="text-sm text-slate-600">From {shopOf(garage.rental.company)?.name} until {date(garage.rental.endsAt)}. Return it there for your {aed(garage.rental.deposit)} deposit.</p>
                <FuelBar fuel={Number(garage.rental.fuel)} electric={!!c?.electric} />
              </Card>
            );
          })()}

          {(garage.stolen ?? []).length > 0 && (
            <>
              <h3 className="font-semibold text-rose-600 px-1 pt-2">🔥 Hotwired Vehicles (Stolen)</h3>
              {garage.stolen!.map((s) => {
                const c = carOf(s.car);
                return (
                  <Card key={s.id} className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-300">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-rose-200">🏎️</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 truncate">{c?.make} {c?.model}</p>
                        <p className="text-xs font-bold text-rose-700">Stolen from @{s.ownerUsername} · Plate {s.plate}</p>
                      </div>
                    </div>
                    {s.isReportedStolen && (
                      <div className="p-2 rounded-xl bg-rose-600 text-white text-[11px] font-black flex items-center gap-1.5 animate-pulse">
                        <span>🚨 WANTED: Police APB Active! Patrols &amp; Salik cameras will chase you if seen!</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        onClose();
                        router.push(`/explore?to=marina`);
                      }}
                      className="w-full h-11 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 shadow-md"
                    >
                      <span>🚗 Drive Stolen Vehicle</span>
                    </button>
                  </Card>
                );
              })}
            </>
          )}

          {fines.length > 0 && (
            <>
              <h3 className="font-semibold text-slate-500 px-1 pt-2">RTA fines (30 days)</h3>
              <Card>
                {fines.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 py-1">
                    <span className="text-xl">{f.kind === "speeding" ? "📸" : f.kind === "parking_unpaid" ? "🅿️" : "🚧"}</span>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{f.reason}</p><p className="text-xs text-slate-500 truncate">{f.place ? `${f.place} · ` : ""}{date(f.issuedAt)}</p></div>
                    <span className="font-black text-rose-600 text-sm">{aed(f.amount)}</span>
                  </div>
                ))}
              </Card>
            </>
          )}
          <h3 className="font-semibold text-slate-500 px-1 pt-2">Rent a car</h3>
          {CARS.rentals.map((r) => (
            <button key={r.id} onClick={() => visit(r.id)} className="w-full flex items-center gap-3 p-3 rounded-[22px] bg-slate-100/80 text-left">
              <span className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black" style={{ background: r.color }}>{r.name[0]}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold">{r.name}</span><span className="block text-xs text-slate-500 truncate">From {aed(Math.min(...r.fleet.map((id) => carOf(id)?.day ?? 0)))} a day</span></span>
              <span className="text-slate-400">›</span>
            </button>
          ))}
          <h3 className="font-semibold text-slate-500 px-1 pt-2">Buy a car</h3>
          {CARS.dealers.map((d) => (
            <button key={d.id} onClick={() => visit(d.id)} className="w-full flex items-center gap-3 p-3 rounded-[22px] bg-slate-100/80 text-left">
              <span className="w-11 h-11 rounded-full flex items-center justify-center text-xl text-white" style={{ background: d.color }}>{d.icon}</span>
              <span className="flex-1 min-w-0"><span className="block font-semibold">{d.name}</span><span className="block text-xs text-slate-500 truncate">From {aed(Math.min(...d.stock.map((id) => carOf(id)?.price ?? 0)))}</span></span>
              <span className="text-slate-400">›</span>
            </button>
          ))}
          <p className="text-center text-xs text-slate-400 px-4">All on Sheikh Zayed Road. Real brands shown as places to visit; not affiliated.</p>
        </>
      )}
    </AppScreen>
  );
}

function FuelBar({ fuel, electric }: { fuel: number; electric: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold">
      <span>{electric ? "⚡" : "⛽"}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full ${fuel < 15 ? "bg-rose-500" : electric ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${fuel}%` }} /></div>
      <span className="tabular-nums">{Math.round(fuel)}%</span>
    </div>
  );
}
