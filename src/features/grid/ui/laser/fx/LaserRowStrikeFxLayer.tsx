// src/features/grid/ui/laser/fx/LaserRowStrikeFxLayer.tsx
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import type { CSSProperties } from 'react';

export type LaserStrikeBurst = Readonly<{
  id: string;
  row: number;

  // timing
  lifeMs: number;

  // visuals
  peakOpacity: number;

  bandScaleYFrom: number;
  bandScaleYPeak: number;
  bandScaleYEnd: number;

  coreHeightPct: number;
  corePeakOpacity: number;

  coreScaleYFrom: number;
  coreScaleYPeak: number;
  coreScaleYEnd: number;

  noiseOpacity: number;

  scanEnabled: boolean;
  scanDurationMs: number;
  scanWidthPct: number;
}>;

export type LaserRowStrikeFxLayerProps = Readonly<{
  bursts: readonly LaserStrikeBurst[];
  height: number;
  zIndex?: number;
  reducedMotionHint?: boolean;
}>;

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function LaserRowStrikeFxLayer({ bursts, height, zIndex = 86, reducedMotionHint }: LaserRowStrikeFxLayerProps) {
  const prefersReducedMotion = useReducedMotion();
  const rm = !!reducedMotionHint || prefersReducedMotion;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleId = 'match3-laser-strike-fx-style';
    if (document.getElementById(styleId)) return;

    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
@keyframes match3LaserStrikeNoiseDrift {
  0% { background-position: 0% 0%, 60% 40%, 0% 0%; }
  50% { background-position: 120% 60%, 20% 80%, 40% 100%; }
  100% { background-position: 240% 0%, 60% 20%, 0% 0%; }
}

.match3-laser-strike-noise {
  background-image:
    radial-gradient(circle at 20% 35%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 56%),
    radial-gradient(circle at 78% 62%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 62%),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, rgba(0,0,0,0) 1px 3px);
  background-size: 180px 90px, 240px 120px, 100% 100%;
  animation: match3LaserStrikeNoiseDrift 1.6s linear infinite;
  mix-blend-mode: overlay;
}
`.trim();
    document.head.appendChild(el);
  }, []);

  if (bursts.length === 0) return null;

  const rowH = height > 0 ? 100 / height : 0;

  const rootStyle: CSSProperties = { zIndex };

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={rootStyle}>
      <AnimatePresence>
        {bursts.map((b) => {
          const top = height > 0 ? (b.row / height) * 100 : 0;

          const rowStyle: CSSProperties = {
            top: `${top}%`,
            height: `${rowH}%`,
          };

          const peakOpacity = clampNum(b.peakOpacity, 0, 1);
          const corePeakOpacity = clampNum(b.corePeakOpacity, 0, 1);

          const durSec = rm ? 0.16 : Math.max(0.04, (b.lifeMs | 0) / 1000);

          const bandScaleYFrom = rm ? 1 : clampNum(b.bandScaleYFrom, 0.2, 2.5);
          const bandScaleYPeak = rm ? 1 : clampNum(b.bandScaleYPeak, 0.2, 2.5);
          const bandScaleYEnd = rm ? 1 : clampNum(b.bandScaleYEnd, 0.2, 2.5);

          const coreScaleYFrom = rm ? 1 : clampNum(b.coreScaleYFrom, 0.2, 3.5);
          const coreScaleYPeak = rm ? 1 : clampNum(b.coreScaleYPeak, 0.2, 3.5);
          const coreScaleYEnd = rm ? 1 : clampNum(b.coreScaleYEnd, 0.2, 3.5);

          const coreHeightPct = clampNum(b.coreHeightPct, 4, 96);
          const noiseOpacity = clampNum(b.noiseOpacity, 0, 1);

          const scanEnabled = !rm && !!b.scanEnabled;
          const scanDurationSec = Math.max(0.04, (b.scanDurationMs | 0) / 1000);
          const scanWidthPct = clampNum(b.scanWidthPct, 4, 80);

          // LASER TRANSITION DURATION
          return (
            <motion.div
              key={b.id}
              className="absolute left-0 right-0"
              style={rowStyle}
              initial={{ opacity: 0, scaleY: bandScaleYFrom }}
              animate={{
                opacity: rm ? [0, peakOpacity * 0.9, 0] : [0, peakOpacity, 0],
                scaleY: [bandScaleYFrom, bandScaleYPeak, bandScaleYEnd],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: durSec,
                ease: 'easeOut',
                times: [0, 0.22, 1],
              }}
            >
              {/* Base wash */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(59,130,246,0.00) 0%, rgba(59,130,246,0.22) 22%, rgba(147,197,253,0.26) 50%, rgba(59,130,246,0.22) 78%, rgba(59,130,246,0.00) 100%)',
                  boxShadow: '0 0 18px rgba(59,130,246,0.22), 0 0 46px rgba(59,130,246,0.12)',
                }}
              />

              {/* Crisp frame */}
              <div
                className="absolute inset-0"
                style={{
                  borderTop: '1px solid rgba(191,219,254,0.48)',
                  borderBottom: '1px solid rgba(191,219,254,0.48)',
                  boxShadow: '0 0 10px rgba(59,130,246,0.40)',
                }}
              />

              {/* Grain / noise */}
              <div className="absolute inset-0 match3-laser-strike-noise" style={{ opacity: noiseOpacity }} />

              {/* Beam core */}
              <motion.div
                className="absolute left-0 right-0"
                style={{
                  top: '50%',
                  height: `${coreHeightPct}%`,
                  transform: 'translateY(-50%)',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(191,219,254,0.92) 35%, rgba(255,255,255,0) 100%)',
                  boxShadow: '0 0 26px rgba(59,130,246,0.55), 0 0 60px rgba(59,130,246,0.25)',
                  filter: 'blur(0.2px)',
                  mixBlendMode: 'screen',
                }}
                initial={{ opacity: 0, scaleY: coreScaleYFrom }}
                animate={{
                  opacity: rm ? [0, corePeakOpacity * 0.95, 0] : [0, corePeakOpacity, 0],
                  scaleY: [coreScaleYFrom, coreScaleYPeak, coreScaleYEnd],
                }}
                transition={{
                  duration: durSec,
                  ease: 'easeOut',
                  times: [0, 0.18, 1],
                }}
              />

              {/* Scan streak (fast left->right) */}
              {scanEnabled ? (
                <motion.div
                  className="absolute top-0 bottom-0"
                  style={{
                    width: `${scanWidthPct}%`,
                    left: `-${scanWidthPct + 4}%`,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(219,234,254,0.50) 45%, rgba(255,255,255,0) 100%)',
                    filter: 'blur(1px)',
                    mixBlendMode: 'screen',
                  }}
                  initial={{ x: '0%' }}
                  animate={{ x: '530%' }}
                  transition={{ duration: scanDurationSec, ease: 'easeOut' }}
                />
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
