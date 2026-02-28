import { createContext } from 'react';
import type { MutableRefObject } from 'react';

export type PowerId = 'gridlaser' | 'laser' | 'extraShuffle';

export type OverlayName = 'settings' | 'win' | 'lose' | 'quitConfirm' | 'powerChoice' | 'login' | 'register' | null;

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

  powerChoiceTitle?: string;
  expPreview?: ExpPreview;
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
  openQuitConfirm: () => void;
  openPowerChoice: (opts?: OpenPowerChoiceOptions) => void;
  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
};

export type OverlayContextValue = {
  active: OverlayName;
  data: OverlayData;
  powerChoiceOnChooseRef: MutableRefObject<OpenPowerChoiceOptions['onChoose'] | null>;

  api: OverlayApi;
};

export const OverlayContext = createContext<OverlayContextValue | null>(null);
