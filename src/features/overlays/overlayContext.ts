// src/features/overlays/overlayContext.ts
import { createContext } from 'react';
import type { MutableRefObject } from 'react';

export type PowerId = 'gridlaser' | 'laser' | 'extraShuffle';

export type OverlayName = 'settings' | 'win' | 'lose' | 'quitConfirm' | 'missionReport' | 'levelUp' | 'powerChoice' | 'login' | 'register' | null;

export type WinMode = 'returnToMap' | 'continue';
export type QuitDestination = 'map' | 'home';

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
  quitDestination?: QuitDestination;
  expPreview?: ExpPreview;
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

export type OpenPowerChoiceOptions = {
  title?: string;
  expPreview?: ExpPreview;
  onChoose?: (powerId: PowerId) => void;
};

export type OverlayApi = {
  openSettings: () => void;
  openWin: (levelOrOpts?: number | OpenWinOptions) => void;
  openLose: (level?: number) => void;
  openQuitConfirm: (destination?: QuitDestination) => void;
  openMissionReport: (opts?: OpenMissionReportOptions) => void;
  openLevelUp: (opts?: OpenLevelUpOptions) => void;
  openPowerChoice: (opts?: OpenPowerChoiceOptions) => void;
  openLogin: () => void;
  openRegister: () => void;
  closeAuth: (name: 'login' | 'register') => void;
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
