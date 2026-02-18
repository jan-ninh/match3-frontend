// import type { HudObjective } from '../../../lib/hud/typesHud';

// type Obj = Extract<HudObjective, { kind: 'match5Swaps' }>;

// type Props = {
//   objective: Obj;
// };

// export function ObjectiveMatch5Swaps({ objective }: Props) {
//   const done = Math.max(0, objective.done);
//   const required = Math.max(0, objective.required);
//   const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 0;

//   return (
//     <div className="rounded-2xl border border-fuchsia-400/20 bg-black/45 backdrop-blur px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45),0_0_24px_rgba(217,70,239,0.14)]">
//       <div className="flex items-baseline justify-between gap-3">
//         <div className="text-xs tracking-widest text-fuchsia-200/70 uppercase">Objective</div>
//         <div className="text-xs text-white/65 tabular-nums">
//           {done}/{required}
//         </div>
//       </div>

//       <div className="mt-1 text-lg font-semibold text-white/90">Pentamatch Protocol</div>
//       <div className="mt-1 text-xs text-white/60 leading-snug">
//         Create a <span className="font-semibold text-white/75">5-in-a-row</span> with a swap. Cascades don’t count.
//       </div>

//       <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
//         <div className="h-full bg-fuchsia-400/60" style={{ width: `${pct}%` }} />
//       </div>

//       <div className="mt-2 text-[11px] text-white/50">Outcome is evaluated only when moves hit 0.</div>
//     </div>
//   );
// }
