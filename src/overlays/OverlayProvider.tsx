import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import OverlayHost from './OverlayHost';
import { OverlayContext, type OverlayApi, type OverlayContextValue, type OverlayData, type OverlayName, type OpenPowerChoiceOptions } from './overlayContext';

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<OverlayName>(null);
  const [data, setData] = useState<OverlayData>({});

  const powerChoiceOnChooseRef = useRef<OpenPowerChoiceOptions['onChoose'] | null>(null);

  const api: OverlayApi = useMemo(
    () => ({
      openSettings: () => {
        setData({});
        setActive('settings');
      },
      openWin: (level?: number) => {
        setData({ level });
        setActive('win');
      },
      openLose: (level?: number) => {
        setData({ level });
        setActive('lose');
      },
      openQuitConfirm: () => {
        setData({});
        setActive('quitConfirm');
      },
      openPowerChoice: (opts?: OpenPowerChoiceOptions) => {
        powerChoiceOnChooseRef.current = opts?.onChoose ?? null;
        setData({ powerChoiceTitle: opts?.title ?? 'Choose your Power!' });
        setActive('powerChoice');
      },
      openLogin: () => {
        setData({});
        setActive('login');
      },
      openRegister: () => {
        setData({});
        setActive('register');
      },
      close: () => {
        setActive(null);
        setData({});
        powerChoiceOnChooseRef.current = null;
      },
    }),
    [],
  );

  const value: OverlayContextValue = useMemo(() => ({ active, data, powerChoiceOnChooseRef, api }), [active, data, api]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <OverlayHost />
    </OverlayContext.Provider>
  );
}
