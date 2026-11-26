"use client";

// Doha's ground (/doha): the Gulf across the top, with The Pearl's island and Lusail's waterfront (each on its beach);
// the coast below them, and Doha Bay's crescent cut into the Corniche with its palms and dhows; the highways (the
// Corniche, Lusail Expressway, the airport road, Salwa Road west to Al Rayyan); the desert down to the Inland Sea,
// Khor Al Adaid, where the dunes meet the water. Qatar's colours on the land, unlike the UAE maps: a rosy desert,
// maroon roads (the water is the same blue in every city). Drawn in rendered map coordinates (y down), under the plains.

import { DQ_PLAINS, type DqPlain } from "@/lib/city/doha/map";

const W = 4000, H = 2600;
const SLANT = 0.2355, TILT = 0.01667;

/** A plain's outline (as FloorTile draws it), pushed out by `pad`. */
function outline(p: DqPlain, pad: number) {
  const yc = p.y + (p.x - 2000) * TILT;
  const w = p.w + pad * 2, h = p.h + pad * 2;
  const left = p.x - w / 2, top = yc - h / 2;
  const sx = h * SLANT, ty = (w - sx) * TILT;
  return [[left + sx, top], [left + w, top + ty], [left + w - sx, top + h], [left, top + h - ty]].map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(" ");
}
const plain = (id: string) => DQ_PLAINS.find((p) => p.id === id)!;
const mid = (id: string) => { const p = plain(id); return { x: p.x, y: p.y + (p.x - 2000) * TILT }; };

// Boats crossing the Gulf and the bay: dhows (with their sails) and yachts.
const BOATS = Array.from({ length: 10 }, (_, i) => ({
  y: 280 + (i % 3) * 200 + (i * 37) % 60, dur: 70 + (i * 23) % 50, delay: -((i * 31) % 70), dhow: i % 2 === 0, rev: i % 2 === 1,
}));

export function DohaBackground() {
  const islands = DQ_PLAINS.filter((p) => p.island);
  const westbay = mid("dq-tile-westbay"), katara = mid("dq-tile-katara"), corniche = mid("dq-tile-corniche"), souq = mid("dq-tile-souq");
  const aspire = mid("dq-tile-aspire"), doh = mid("dq-tile-doh"), edu = mid("dq-tile-education"), desert = mid("dq-tile-desert");
  const pearl = mid("dq-tile-pearl"), lusail = mid("dq-tile-lusail");
  // The coast: under The Pearl and Lusail, and further down in the east, where Gewan Island and Al Khor are offshore.
  const coast = 900, eastCoast = 1370;
  const roadY = (id: string) => mid(id).y + plain(id).h / 2 + 38;
  return (
    <svg width={W} height={H} className="map-animated absolute inset-0 pointer-events-none overflow-visible">
      <defs>
        <linearGradient id="dq-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3aa6dd" /><stop offset="1" stopColor="#6cc4ee" /></linearGradient>
        <pattern id="dq-ripples" width="120" height="60" patternUnits="userSpaceOnUse"><path d="M0 30 Q30 22 60 30 T120 30" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="3" /></pattern>
      </defs>
      {/* The desert all round. */}
      <rect x={-2000} y={-1500} width={W + 4000} height={H + 3000} fill="#e2b48b" />
      {/* The Gulf, down to the coast under The Pearl and Lusail. */}
      <path d={`M -2000,-1500 L ${W + 3000},-1500 L ${W + 3000},${eastCoast} L 3600,${eastCoast} C 3480,${eastCoast} 3460,${coast + 20} 3330,${coast + 20} C 2600,${coast + 30} 2000,${coast + 20} 1200,${coast + 10} C 200,${coast + 30} -800,${coast + 10} -2000,${coast} Z`} fill="url(#dq-sea)" />
      <path d={`M -2000,-1500 L ${W + 3000},-1500 L ${W + 3000},${eastCoast} L 3600,${eastCoast} C 3480,${eastCoast} 3460,${coast + 20} 3330,${coast + 20} C 2600,${coast + 30} 2000,${coast + 20} 1200,${coast + 10} C 200,${coast + 30} -800,${coast + 10} -2000,${coast} Z`} fill="url(#dq-ripples)" />
      <path d={`M ${W + 3000},${eastCoast} L 3600,${eastCoast} C 3480,${eastCoast} 3460,${coast + 20} 3330,${coast + 20} C 2600,${coast + 30} 2000,${coast + 20} 1200,${coast + 10} C 200,${coast + 30} -800,${coast + 10} -2000,${coast}`} fill="none" stroke="#f7e6d2" strokeWidth="24" />
      {/* Doha Bay: the crescent of water inside the Corniche, ringed by its palm-lined promenade. */}
      <path d={`M ${corniche.x - 700},${coast + 10} Q ${corniche.x - 120},${coast + 200} ${corniche.x + 520},${coast + 10} Z`} fill="url(#dq-sea)" />
      <path d={`M ${corniche.x - 700},${coast + 10} Q ${corniche.x - 120},${coast + 200} ${corniche.x + 520},${coast + 10}`} fill="none" stroke="#efe3c4" strokeWidth="14" />
      {Array.from({ length: 16 }, (_, i) => {
        const t = i / 15, x = (1 - t) * (1 - t) * (corniche.x - 700) + 2 * (1 - t) * t * (corniche.x - 120) + t * t * (corniche.x + 520);
        const y = (1 - t) * (1 - t) * (coast + 10) + 2 * (1 - t) * t * (coast + 200) + t * t * (coast + 10) + 12;
        return <g key={`p${i}`} transform={`translate(${x},${y})`}><line x1={0} y1={0} x2={0} y2={-16} stroke="#8b6b4a" strokeWidth={2} />{[-50, 0, 50, 130, 180].map((a) => <path key={a} d="M0,-16 q8,-3 13,3" transform={`rotate(${a} 0 -16)`} fill="none" stroke="#2f7d32" strokeWidth={2.4} strokeLinecap="round" />)}</g>;
      })}
      {/* The islands (The Pearl, Lusail's waterfront), each on its beach with shallows round it. */}
      {islands.map((p) => <polygon key={`s${p.id}`} points={outline(p, 70)} fill="#9fdcf5" opacity={0.7} />)}
      {islands.map((p) => <polygon key={`b${p.id}`} points={outline(p, 34)} fill="#f7e6d2" />)}
      {/* The Pearl's ring of lagoons (its shape from the air). */}
      <ellipse cx={pearl.x - 640} cy={pearl.y - 40} rx={60} ry={120} fill="#7dd3fc" opacity={0.6} />
      {/* The Inland Sea: the Gulf reaching into the desert at the bottom right, the dunes running down to it. */}
      <path d={`M ${desert.x + 700},${desert.y + 260} Q ${desert.x + 980},${desert.y - 60} ${W + 600},${desert.y + 40} L ${W + 600},${H + 400} L ${desert.x + 600},${H + 400} Z`} fill="url(#dq-sea)" />
      {Array.from({ length: 26 }, (_, i) => <path key={`d${i}`} d={`M ${200 + (i * 173) % 3800},${2380 + (i * 61) % 260} q 60,-34 120,0`} fill="none" stroke="#c98d63" strokeWidth={8} strokeLinecap="round" opacity={0.7} />)}
      {/* Highways: grey roadbeds with dashed lanes. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[
          `M -1500,${roadY("dq-tile-westbay") - (westbay.x + 1500) * TILT} L ${W + 1700},${roadY("dq-tile-westbay") + (W + 1700 - westbay.x) * TILT}`,
          `M -1500,${roadY("dq-tile-souq") - (souq.x + 1500) * TILT} L ${W + 1700},${roadY("dq-tile-souq") + (W + 1700 - souq.x) * TILT}`,
          `M -1500,${roadY("dq-tile-education") - (edu.x + 1500) * TILT} L ${W + 1700},${roadY("dq-tile-education") + (W + 1700 - edu.x) * TILT}`,
          `M -1500,${roadY("dq-tile-ummsalal") - (mid("dq-tile-ummsalal").x + 1500) * TILT} L ${W + 1700},${roadY("dq-tile-ummsalal") + (W + 1700 - mid("dq-tile-ummsalal").x) * TILT}`,
          `M ${katara.x + 360},${katara.y - 200} L ${lusail.x - 600},${lusail.y + 230}`,
          `M ${westbay.x + 200},${westbay.y - 200} L ${pearl.x + 300},${pearl.y + 220}`,
          `M ${aspire.x},${roadY("dq-tile-aspire")} L ${edu.x + 200},${roadY("dq-tile-education") - 180}`,
          `M ${doh.x - 300},${roadY("dq-tile-doh")} L ${desert.x - 200},${roadY("dq-tile-desert") - 180}`,
        ].map((d, i) => (
          <g key={i}><path d={d} stroke="#5b2333" strokeWidth={46} /><path d={d} stroke="#f8fafc" strokeWidth={3} strokeDasharray="26 22" opacity={0.85} /></g>
        ))}
      </g>
      {/* The bridges' white spans over the water to The Pearl and to Lusail. */}
      {[
        { x: (westbay.x + 200 + pearl.x + 300) / 2, y: (westbay.y - 200 + pearl.y + 220) / 2 },
        { x: (katara.x + 360 + lusail.x - 600) / 2, y: (katara.y - 200 + lusail.y + 230) / 2 },
        { x: mid("dq-tile-gewan").x - 300, y: mid("dq-tile-gewan").y + 230 },
      ].map((b, i) => (
        <g key={`br${i}`} transform={`translate(${b.x},${b.y})`}>
          <path d="M -60,8 Q -30,-46 0,8 Q 30,-46 60,8" fill="none" stroke="#f8fafc" strokeWidth={7} />
        </g>
      ))}
      {/* Boats on the Gulf. */}
      {BOATS.map((bt, i) => (
        <g key={`boat${i}`}>
          <animateMotion dur={`${bt.dur}s`} begin={`${bt.delay}s`} repeatCount="indefinite" path={bt.rev ? `M ${W + 200},${bt.y} L -200,${bt.y + 30}` : `M -200,${bt.y} L ${W + 200},${bt.y + 30}`} />
          {bt.dhow ? (
            <g transform={bt.rev ? "scale(-1,1)" : undefined}><path d="M -26,0 L 26,0 L 18,9 L -20,9 Z" fill="#8b5a2b" /><path d="M 0,-2 L 0,-34 L 20,-4 Z" fill="#fef3c7" /><rect x={-14} y={2} width={28} height={2} fill="#8a1538" /></g>
          ) : (
            <g transform={bt.rev ? "scale(-1,1)" : undefined}><path d="M -24,0 L 22,0 L 30,-6 L -20,-6 Z" fill="#ffffff" /><rect x={-10} y={-13} width={20} height={7} rx={2} fill="#e2e8f0" /></g>
          )}
        </g>
      ))}
    </svg>
  );
}
