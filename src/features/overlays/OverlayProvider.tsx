import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import OverlayHost from './OverlayHost';
import {
  OverlayContext,
  type OverlayApi,
  type OverlayContextValue,
  type OverlayData,
  type OverlayName,
  type OpenPowerChoiceOptions,
} from './overlayContext';

type QueuedOverlay = Readonly<{
  name: 'win';
  data: OverlayData;
}>;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<OverlayName>(null);
  const [data, setData] = useState<OverlayData>({});
  const powerChoiceOnChooseRef = useRef<OpenPowerChoiceOptions['onChoose'] | null>(null);

  // Keep latest state accessible inside a stable `api` object (api is memoized with []).
  const activeRef = useRef<OverlayName>(active);
  const dataRef = useRef<OverlayData>(data);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Sequencing: If both Win + PowerChoice are requested, PowerChoice must be shown first.
  // This avoids "WinOverlay blocks PowerChoice" when multiple callsites race.
  const queuedRef = useRef<QueuedOverlay | null>(null);

  const api: OverlayApi = useMemo(
    () => ({
      openSettings: () => {
        queuedRef.current = null;
        setData({});
        setActive('settings');
      },
      openWin: (level?: number) => {
        // If PowerChoice is open, queue Win until PowerChoice closes.
        if (activeRef.current === 'powerChoice') {
          queuedRef.current = { name: 'win', data: { level } };
          return;
        }

        queuedRef.current = null;
        setData({ level });
        setActive('win');
      },
      openLose: (level?: number) => {
        queuedRef.current = null;
        setData({ level });
        setActive('lose');
      },
      openQuitConfirm: () => {
        queuedRef.current = null;
        setData({});
        setActive('quitConfirm');
      },
      openPowerChoice: (opts?: OpenPowerChoiceOptions) => {
        // If Win is currently visible, preempt it and queue it for after the reward choice.
        if (activeRef.current === 'win') {
          queuedRef.current = { name: 'win', data: { level: dataRef.current.level } };
        }

        powerChoiceOnChooseRef.current = opts?.onChoose ?? null;
        setData({ powerChoiceTitle: opts?.title ?? 'Choose your Power!' });
        setActive('powerChoice');
      },
      openLogin: () => {
        queuedRef.current = null;
        setData({});
        setActive('login');
      },
      openRegister: () => {
        queuedRef.current = null;
        setData({});
        setActive('register');
      },
      close: () => {
        const was = activeRef.current;

        // close current overlay
        setActive(null);
        setData({});
        powerChoiceOnChooseRef.current = null;

        // If we just closed PowerChoice and Win is queued, open Win immediately after.
        if (was === 'powerChoice') {
          const q = queuedRef.current;
          queuedRef.current = null;

          if (q && q.name === 'win') {
            setData(q.data);
            setActive('win');
          }

          return;
        }

        // Any other close clears queued overlays (avoid stale Win popping later).
        queuedRef.current = null;
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
