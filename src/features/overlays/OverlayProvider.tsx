// src/features/overlays/OverlayProvider.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import OverlayHost from './OverlayHost';
import { OverlayContext, type OverlayApi, type OverlayContextValue, type OverlayData, type OverlayName, type OpenPowerChoiceOptions } from './overlayContext';

type QueuedOverlay = Readonly<{
  name: 'win';
  data: OverlayData;
}>;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<OverlayName>(null);
  const [data, setData] = useState<OverlayData>({});
  const powerChoiceOnChooseRef = useRef<OpenPowerChoiceOptions['onChoose'] | null>(null);

  // Keep latest state accessible inside a stable `api` object (api is memoized with []).
  // IMPORTANT: refs must be updated synchronously inside api methods to avoid same-tick races.
  const activeRef = useRef<OverlayName>(active);
  const dataRef = useRef<OverlayData>(data);

  const setOverlayRef = useRef<(nextActive: OverlayName, nextData: OverlayData) => void>(() => {});

  setOverlayRef.current = (nextActive: OverlayName, nextData: OverlayData) => {
    activeRef.current = nextActive;
    dataRef.current = nextData;

    setActive(nextActive);
    setData(nextData);
  };

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
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('settings', {});
      },
      openWin: (level?: number) => {
        // If PowerChoice is (or is about to be) open, queue Win until PowerChoice closes.
        if (activeRef.current === 'powerChoice') {
          queuedRef.current = { name: 'win', data: { level } };
          return;
        }

        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('win', { level });
      },
      openLose: (level?: number) => {
        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('lose', { level });
      },
      openQuitConfirm: () => {
        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('quitConfirm', {});
      },
      openPowerChoice: (opts?: OpenPowerChoiceOptions) => {
        // If Win is currently visible, preempt it and queue it for after the reward choice.
        if (activeRef.current === 'win') {
          queuedRef.current = { name: 'win', data: { level: dataRef.current.level } };
        }

        powerChoiceOnChooseRef.current = opts?.onChoose ?? null;
        setOverlayRef.current('powerChoice', {
          level: dataRef.current.level,
          powerChoiceTitle: opts?.title ?? 'Choose your Power!',
        });
      },
      openLogin: () => {
        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('login', {});
      },
      openRegister: () => {
        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('register', {});
      },
      close: () => {
        const was = activeRef.current;

        // close current overlay
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current(null, {});

        // If we just closed PowerChoice and Win is queued, open Win immediately after.
        if (was === 'powerChoice') {
          const q = queuedRef.current;
          queuedRef.current = null;

          if (q && q.name === 'win') {
            setOverlayRef.current('win', q.data);
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
