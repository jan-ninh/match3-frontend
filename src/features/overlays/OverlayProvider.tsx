// src/features/overlays/OverlayProvider.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import OverlayHost from './OverlayHost';
import {
  OverlayContext,
  type OpenLevelUpOptions,
  type OpenMissionReportOptions,
  type OpenPowerChoiceOptions,
  type OpenWinOptions,
  type OverlayApi,
  type OverlayContextValue,
  type OverlayData,
  type OverlayName,
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
  const location = useLocation();
  const route = location.pathname + location.search;
  const previousRoute = useRef(route);

  const missionReportOnDoneRef = useRef<OpenMissionReportOptions['onDone'] | null>(null);
  const levelUpOnChooseRef = useRef<OpenLevelUpOptions['onChoose'] | null>(null);

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

  // Sequencing: FIFO queue (Win -> MissionReport -> optional LevelUp).
  const queueRef = useRef<QueuedOverlay[]>([]);

  const resetAll = () => {
    queueRef.current = [];
    missionReportOnDoneRef.current = null;
    levelUpOnChooseRef.current = null;
  };

  const enqueue = (q: QueuedOverlay) => {
    queueRef.current.push(q);
  };

  const openNextQueued = () => {
    const q = queueRef.current.shift();
    if (!q) return;
    setOverlayRef.current(q.name, q.data);
  };

  const api: OverlayApi = useMemo(
    () => ({
      openSettings: () => {
        resetAll();
        setOverlayRef.current('settings', {});
      },
      openWin: (levelOrOpts?: number | OpenWinOptions) => {
        const { level, mode } = normalizeOpenWinArg(levelOrOpts);
        resetAll();
        setOverlayRef.current('win', { level, winMode: mode });
      },
      openLose: (level?: number) => {
        resetAll();
        setOverlayRef.current('lose', { level });
      },
      openQuitConfirm: () => {
        resetAll();
        setOverlayRef.current('quitConfirm', {});
      },

      openMissionReport: (opts?: OpenMissionReportOptions) => {
        missionReportOnDoneRef.current = opts?.onDone ?? null;

        const nextData: OverlayData = {
          ...dataRef.current,
          expPreview: opts?.expPreview,
          missionReportTitle: opts?.title,
        };

        // If another overlay is visible, queue MissionReport.
        if (activeRef.current !== null) {
          enqueue({ name: 'missionReport', data: nextData });
          return;
        }

        setOverlayRef.current('missionReport', nextData);
      },

      openLevelUp: (opts?: OpenLevelUpOptions) => {
        levelUpOnChooseRef.current = opts?.onChoose ?? null;

        const nextData: OverlayData = {
          ...dataRef.current,
          levelUpTitle: opts?.title ?? 'Choose your Reward!',
          powerChoiceTitle: opts?.title ?? 'Choose your Reward!', // legacy field
        };

        // If another overlay is visible, queue LevelUp.
        if (activeRef.current !== null) {
          enqueue({ name: 'levelUp', data: nextData });
          return;
        }

        setOverlayRef.current('levelUp', nextData);
      },

      // Legacy alias: open the LevelUp reward selection overlay.
      openPowerChoice: (opts?: OpenPowerChoiceOptions) => {
        levelUpOnChooseRef.current = opts?.onChoose ?? null;

        const nextData: OverlayData = {
          ...dataRef.current,
          levelUpTitle: opts?.title ?? 'Choose your Reward!',
          powerChoiceTitle: opts?.title ?? 'Choose your Power!',
          // NOTE: legacy callers might send expPreview here; LevelUp UI currently ignores it.
          expPreview: opts?.expPreview,
        };

        if (activeRef.current !== null) {
          enqueue({ name: 'levelUp', data: nextData });
          return;
        }

        setOverlayRef.current('levelUp', nextData);
      },

      openLogin: () => {
        resetAll();
        setOverlayRef.current('login', {});
      },
      openRegister: () => {
        resetAll();
        setOverlayRef.current('register', {});
      },
      closeAuth: (name) => {
        if (activeRef.current === name) setOverlayRef.current(null, {});
      },

      close: () => {
        const closing = activeRef.current;

        // Clear handler refs when their overlay closes.
        if (closing === 'missionReport') {
          missionReportOnDoneRef.current = null;
        }
        if (closing === 'levelUp' || closing === 'powerChoice') {
          levelUpOnChooseRef.current = null;
        }

        // close current overlay
        setOverlayRef.current(null, {});

        // open next queued overlay, if any
        openNextQueued();
      },
    }),
    [],
  );

  useEffect(() => {
    if (previousRoute.current !== route) {
      const current = activeRef.current;
      if (current === 'login' || current === 'register') api.closeAuth(current);
      previousRoute.current = route;
    }
  }, [route, api]);

  const value: OverlayContextValue = useMemo(() => ({ active, data, missionReportOnDoneRef, levelUpOnChooseRef, api }), [active, data, api]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <OverlayHost />
    </OverlayContext.Provider>
  );
}
