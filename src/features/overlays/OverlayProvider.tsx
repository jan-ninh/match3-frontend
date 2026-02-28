import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import OverlayHost from './OverlayHost';
import {
  OverlayContext,
  type OpenWinOptions,
  type OverlayApi,
  type OverlayContextValue,
  type OverlayData,
  type OverlayName,
  type OpenPowerChoiceOptions,
  type WinMode,
} from './overlayContext';

type QueuedOverlay = Readonly<{
  name: Exclude<OverlayName, null>;
  data: OverlayData;
}>;

function normalizeOpenWinArg(v: number | OpenWinOptions | undefined): { level?: number; mode: WinMode } {
  if (typeof v === 'number') return { level: v, mode: 'returnToMap' };
  const level = v?.level;
  const mode = v?.mode ?? 'returnToMap';
  return { level, mode };
}

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

  // Sequencing: Win should be shown BEFORE PowerChoice (reward selection).
  // Both overlays stay mounted; only visibility is toggled via `active`.
  const queuedRef = useRef<QueuedOverlay | null>(null);

  const api: OverlayApi = useMemo(
    () => ({
      openSettings: () => {
        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('settings', {});
      },
      openWin: (levelOrOpts?: number | OpenWinOptions) => {
        const { level, mode } = normalizeOpenWinArg(levelOrOpts);

        // If PowerChoice is visible, preempt it and queue it for AFTER Win closes.
        if (activeRef.current === 'powerChoice') {
          queuedRef.current = { name: 'powerChoice', data: { ...dataRef.current } };
          setOverlayRef.current('win', { level, winMode: mode });
          return;
        }

        queuedRef.current = null;
        powerChoiceOnChooseRef.current = null;
        setOverlayRef.current('win', { level, winMode: mode });
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
        // Store handler even if we queue (Win-first flow).
        powerChoiceOnChooseRef.current = opts?.onChoose ?? null;

        const nextData: OverlayData = {
          level: dataRef.current.level,
          powerChoiceTitle: opts?.title ?? 'Choose your Power!',
          expPreview: opts?.expPreview,
        };

        // If Win is currently visible, queue PowerChoice until Win closes.
        if (activeRef.current === 'win') {
          queuedRef.current = { name: 'powerChoice', data: nextData };
          return;
        }

        queuedRef.current = null;
        setOverlayRef.current('powerChoice', nextData);
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
        const q = queuedRef.current;
        const keepPowerChoiceHandler = q?.name === 'powerChoice' && activeRef.current !== 'powerChoice';

        // close current overlay
        if (!keepPowerChoiceHandler) {
          powerChoiceOnChooseRef.current = null;
        }
        setOverlayRef.current(null, {});

        // open queued overlay, if any
        queuedRef.current = null;
        if (q) {
          setOverlayRef.current(q.name, q.data);
        }
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
