import React from 'react';
import { gameInfo } from '@/lib/games/registry';

// A game's tile in Game City: a raised pad in the map's slant, with the game's illustration, its name
// and "Tap to play".

// The plot's slant, plus the slight tilt of its long edges, so each tile sits square on the plot.
const SLANT = 'skewY(0.955deg) skewX(-13.25deg)';

function Art({ game }: { game: string }) {
  switch (game) {
    case 'ludo':
      return (
        <div className="grid grid-cols-2 gap-1 w-16 h-16 p-1 rounded-lg bg-white rotate-6 shadow">
          {['#dc2626', '#16a34a', '#2563eb', '#eab308'].map((c) => <span key={c} className="rounded-md flex items-center justify-center" style={{ background: c }}><span className="w-3 h-3 rounded-full bg-white/90" /></span>)}
        </div>
      );
    case 'chess':
      return <div className="text-6xl leading-none text-amber-200 drop-shadow">♞<span className="text-white">♛</span></div>;
    case 'dominoes':
      return (
        <div className="flex gap-1 -rotate-6">
          {[[6, 4], [4, 1]].map(([a, b], i) => (
            <div key={i} className="w-8 h-16 rounded-md bg-white border border-slate-300 flex flex-col items-center justify-around py-1 shadow">
              <span className="text-[10px] font-black text-slate-900">{'●'.repeat(Math.min(a, 3))}</span>
              <span className="w-6 h-px bg-slate-300" />
              <span className="text-[10px] font-black text-slate-900">{'●'.repeat(Math.min(b, 3))}</span>
            </div>
          ))}
        </div>
      );
    case 'pool':
      return (
        <div className="relative w-24 h-14 rounded-md bg-green-600 border-4 border-amber-800 shadow">
          {[[18, 30, '#facc15'], [30, 40, '#dc2626'], [42, 30, '#111827'], [30, 20, '#2563eb']].map(([x, y, c], i) => <span key={i} className="absolute w-3 h-3 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: c as string }} />)}
          <span className="absolute w-3 h-3 rounded-full bg-white left-[75%] top-[40%]" />
        </div>
      );
    case 'word':
      return <div className="flex gap-0.5">{['W', 'O', 'R', 'D'].map((l) => <span key={l} className="w-7 h-8 rounded bg-amber-300 text-amber-950 font-black text-lg flex items-center justify-center shadow-[0_2px_0_#a16207]">{l}</span>)}</div>;
    case 'connect4':
      return <div className="grid grid-cols-4 gap-1 p-1.5 rounded-lg bg-blue-700 shadow">{[0, 1, 0, -1, 1, 0, 1, 0].map((v, i) => <span key={i} className="w-4 h-4 rounded-full" style={{ background: v === 0 ? '#dc2626' : v === 1 ? '#facc15' : '#0f172a' }} />)}</div>;
    case 'battleship':
      return <div className="text-5xl leading-none drop-shadow">🚢<span className="text-3xl">💥</span></div>;
    case 'checkers':
      return <div className="grid grid-cols-4 w-16 h-16 rounded-md overflow-hidden shadow rotate-6">{Array.from({ length: 16 }, (_, i) => { const dark = (Math.floor(i / 4) + i) % 2 === 1; return <span key={i} className={`flex items-center justify-center ${dark ? 'bg-amber-900' : 'bg-amber-100'}`}>{dark && i < 8 ? <span className="w-3 h-3 rounded-full bg-red-600" /> : dark ? <span className="w-3 h-3 rounded-full bg-slate-900" /> : null}</span>; })}</div>;
    case 'snakes':
      return <div className="text-5xl leading-none">🪜<span className="text-4xl">🐍</span></div>;
    case 'snake':
      return <div className="flex items-center gap-0.5">{[0, 1, 2, 3, 4].map((i) => <span key={i} className={`w-4 h-4 rounded ${i === 4 ? 'bg-lime-300' : 'bg-green-500'}`} />)}<span className="ml-2 text-2xl">🌴</span></div>;
    case 'memory':
      return <div className="grid grid-cols-3 gap-1">{['🏙️', '', '🐪', '', '🏙️', ''].map((x, i) => <span key={i} className={`w-6 h-7 rounded text-sm flex items-center justify-center ${x ? 'bg-white' : 'bg-gradient-to-br from-orange-400 to-rose-500'}`}>{x}</span>)}</div>;
    case 'candy':
      return (
        <div className="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-pink-900/40 border border-pink-400/40 shadow">
          {['🍬', '🍭', '🍩', '🍫', '🍓', '🍋'].map((c, i) => (
            <span key={i} className="text-xl leading-none flex items-center justify-center drop-shadow">
              {c}
            </span>
          ))}
        </div>
      );
    case 'tetris':
      return (
        <div className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-slate-900/90 border border-cyan-400/50 shadow">
          <div className="flex gap-0.5 justify-center">
            <span className="w-3.5 h-3.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </div>
          <div className="flex gap-0.5 justify-center">
            <span className="w-3.5 h-3.5 rounded-sm bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-yellow-400 shadow-[0_0_8px_#facc15]" />
            <span className="w-3.5 h-3.5 rounded-sm bg-yellow-400 shadow-[0_0_8px_#facc15]" />
          </div>
        </div>
      );
    case 'tycoon':
      return (
        <div className="relative w-16 h-16 rounded-md bg-emerald-50 border-2 border-emerald-800 shadow grid grid-cols-4 grid-rows-4 p-0.5 gap-px">
          {Array.from({ length: 16 }, (_, k) => {
            const r = Math.floor(k / 4), c = k % 4, edge = r === 0 || r === 3 || c === 0 || c === 3;
            return <span key={k} className="rounded-[2px]" style={{ background: edge ? ['#92400e', '#38bdf8', '#ec4899', '#f97316', '#dc2626', '#facc15', '#16a34a', '#1e3a8a'][k % 8] : 'transparent' }} />;
          })}
          <span className="absolute inset-0 flex items-center justify-center text-xl">🏙️</span>
        </div>
      );
    case 'trading':
      return (
        <div className="relative flex items-end gap-1 h-14 px-2 pb-1 rounded-lg bg-white/80 shadow">
          {[30, 45, 38, 60, 52, 78].map((h, k) => <span key={k} className="w-2.5 rounded-t-sm" style={{ height: `${h}%`, background: k % 2 ? '#2563eb' : '#60a5fa' }} />)}
          <span className="absolute -top-2 -right-2 text-xl">📈</span>
        </div>
      );
    case 'draw':
      return (
        <div className="relative w-20 h-14 rounded-lg bg-white border-2 border-amber-300 shadow overflow-hidden">
          <svg viewBox="0 0 80 56" className="absolute inset-0"><path d="M10 40 Q22 10 36 30 T64 18" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round" /><circle cx="58" cy="40" r="7" fill="none" stroke="#3b82f6" strokeWidth="3" /></svg>
          <span className="absolute -bottom-1 -right-1 text-xl">✏️</span>
        </div>
      );
    default:
      return <div className="w-14 h-14 rounded-full bg-pink-500 text-white text-4xl font-black flex items-center justify-center shadow">?</div>;
  }
}

export function GameTile({ game, width = 220, height = 150 }: { game: string; width?: number; height?: number }) {
  const info = gameInfo(game);
  if (!info) return null;
  return (
    <div style={{ width, height, transform: SLANT }} className="relative rounded-2xl border-4 border-white shadow-[0_8px_0_rgba(0,0,0,0.25)] overflow-hidden" >
      <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${info.bg}, ${info.accent}55)` }} />
      <div className="relative h-full flex flex-col items-center justify-center gap-1.5 px-2 text-center" style={{ color: info.fg, transform: 'skewX(13.25deg) skewY(-0.955deg)' }}>
        <Art game={game} />
        <div className="font-black text-base leading-tight drop-shadow-sm">{info.name}</div>
        <div className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: info.accent, color: '#fff' }}>Tap to play</div>
      </div>
    </div>
  );
}
