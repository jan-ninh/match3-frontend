// src/features/overlays/overlayContext.ts
import { createContext } from 'react';
import type { MutableRefObject } from 'react';

export type PowerId = 'gridlaser' | 'laser' | 'extraShuffle';

/**
 * NOTE:
 * - 'powerChoice' is kept as a legacy alias for backwards compatibility.
 * - New flow uses: win -> missionReport -> (optional) levelUp.
 */
export type OverlayName =
  | 'settings'
  | 'win'
  | 'lose'
  | 'quitConfirm'
  | 'missionReport'
  | 'levelUp'
  | 'powerChoice'
  | 'login'
  | 'register'
  | null;

export type WinMode = 'returnToMap' | 'continue';

export type OpenWinOptions = {
  level?: number;
  mode?: WinMode;
};

export type ExpPreview = Readonly<{
  fromLevel: number;
  fromExpTotal: number;

  toLevel: number;
  toExpTotal: number;

  expRequired: number;
  expDelta: number;
}>;

export type OverlayData = {
  level?: number;
  winMode?: WinMode;

  expPreview?: ExpPreview;

  // Titles (UI). Keep powerChoiceTitle for legacy callers.
  missionReportTitle?: string;
  levelUpTitle?: string;
  powerChoiceTitle?: string;
};

export type OpenMissionReportOptions = {
  expPreview?: ExpPreview;
  onDone?: () => void;
  title?: string;
};

export type OpenLevelUpOptions = {
  title?: string;
  onChoose?: (powerId: PowerId) => void;
};

/**
 * Legacy API: kept so old call-sites can still compile.
 * Semantics: opens the LevelUp reward selection overlay (not MissionReport).
 */
export type OpenPowerChoiceOptions = {
  title?: string;
  expPreview?: ExpPreview;
  onChoose?: (powerId: PowerId) => void;
};

export type OverlayApi = {
  openSettings: () => void;
  openWin: (levelOrOpts?: number | OpenWinOptions) => void;
  openLose: (level?: number) => void;
  openQuitConfirm: () => void;

  openMissionReport: (opts?: OpenMissionReportOptions) => void;
  openLevelUp: (opts?: OpenLevelUpOptions) => void;

  // Legacy alias (LevelUp selection).
  openPowerChoice: (opts?: OpenPowerChoiceOptions) => void;

  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
};

export type OverlayContextValue = {
  active: OverlayName;
  data: OverlayData;

  missionReportOnDoneRef: MutableRefObject<OpenMissionReportOptions['onDone'] | null>;
  levelUpOnChooseRef: MutableRefObject<OpenLevelUpOptions['onChoose'] | null>;

  api: OverlayApi;
};

export const OverlayContext = createContext<OverlayContextValue | null>(null);
