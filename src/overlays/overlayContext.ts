import { createContext } from 'react';

export type PowerId = 'power-1' | 'power-2' | 'power-3';

export type OverlayName = 'settings' | 'win' | 'lose' | 'quitConfirm' | 'powerChoice' | 'login' | 'register' | null;

export type OverlayData = {
  level?: number;
  powerChoiceTitle?: string;
};

export type OpenPowerChoiceOptions = {
  title?: string;
  onChoose?: (powerId: PowerId) => void;
};

export type OverlayApi = {
  openSettings: () => void;
  openWin: (level?: number) => void;
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
  powerChoiceOnChooseRef: React.MutableRefObject<OpenPowerChoiceOptions['onChoose'] | null>;
  api: OverlayApi;
};

export const OverlayContext = createContext<OverlayContextValue | null>(null);
