import { createElement, Fragment, type ReactElement } from 'react';

export type MatchHintsColors = Readonly<{ tileOverlay: string; blue: string; yellow: string; red: string; black: string }>;

export const COLORS: MatchHintsColors = {
  tileOverlay: 'rgb(200 200 200 / 0.9)', // Tile Overlay Farbe (Heatmap)

  blue:   'rgb(0 50 200)', // prettier-ignore
  yellow: 'rgb(255 230 0)', // prettier-ignore
  red:    'rgb(255 70 90)', // prettier-ignore
  black:  'rgb(0 0 0)', // prettier-ignore
};

export const DOT_R = 0;

export const ARROW = {
  bodyWidth: 7.5,
  headLength: 18,
  headWidth: 18,
  outlineExtra: 6,
  outlineHeadLengthExtra: 2,
  outlineHeadWidthExtra: 8,
} as const;

export type MatchHintsDefIds = Readonly<{
  glowId: string;
  yellowGlowId: string;
  redGlowId: string;
  tileGlowId: string;
}>;

export type MatchHintsDefs = Readonly<{
  ids: MatchHintsDefIds;
  defsJsx: ReactElement;
}>;

export function makeMatchHintsDefs(uid: string, colors: MatchHintsColors = COLORS): MatchHintsDefs {
  const glowId = `mh-glow-${uid}`;
  const yellowGlowId = `mh-glow-yellow-${uid}`;
  const redGlowId = `mh-glow-red-${uid}`;
  const tileGlowId = `mh-tile-glow-${uid}`;

  const defsJsx = createElement(
    'defs',
    null,
    createElement(
      Fragment,
      null,
      createElement(
        'filter',
        { id: tileGlowId, x: '-35%', y: '-35%', width: '170%', height: '170%' },
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '2.5', floodColor: colors.tileOverlay, floodOpacity: '0.55' }),
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '7.5', floodColor: colors.tileOverlay, floodOpacity: '0.3' }),
      ),
      createElement(
        'filter',
        { id: glowId, x: '-35%', y: '-35%', width: '170%', height: '170%' },
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '2.5', floodColor: colors.tileOverlay, floodOpacity: '1' }),
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '8.5', floodColor: colors.tileOverlay, floodOpacity: '0.55' }),
      ),
      createElement(
        'filter',
        { id: yellowGlowId, x: '-35%', y: '-35%', width: '170%', height: '170%' },
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '2.5', floodColor: colors.yellow, floodOpacity: '1' }),
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '8.5', floodColor: colors.yellow, floodOpacity: '0.55' }),
      ),
      createElement(
        'filter',
        { id: redGlowId, x: '-35%', y: '-35%', width: '170%', height: '170%' },
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '2.5', floodColor: colors.red, floodOpacity: '1' }),
        createElement('feDropShadow', { dx: '0', dy: '0', stdDeviation: '8.5', floodColor: colors.red, floodOpacity: '0.55' }),
      ),
    ),
  );

  return { ids: { glowId, yellowGlowId, redGlowId, tileGlowId }, defsJsx };
}
