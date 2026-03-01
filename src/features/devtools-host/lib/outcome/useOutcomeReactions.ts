// src/features/devtools-host/lib/outcome/useOutcomeReactions.ts
import { useCallback, useEffect, useRef } from 'react';

export type OutcomeReactions = {
  onDevWin: () => void;
  onDevLose: () => Promise<void>;
};

export function useOutcomeReactions(args: {
  levelId: number;
  phase: string;
  runWinFlow: (lvl: number) => void;
  runLoseFlow: (lvl: number) => Promise<void>;
}): OutcomeReactions {
  // Dedup win/lose handling per level.
  const handledWinLevelRef = useRef<number | null>(null);
  const handledLoseLevelRef = useRef<number | null>(null);

  const onDevWin = useCallback(() => {
    const lvl = args.levelId;
    handledWinLevelRef.current = lvl;
    args.runWinFlow(lvl);
  }, [args.levelId, args.runWinFlow]);

  const onDevLose = useCallback(async () => {
    const lvl = args.levelId;
    handledLoseLevelRef.current = lvl;
    await args.runLoseFlow(lvl);
  }, [args.levelId, args.runLoseFlow]);

  // React to engine outcome phases.
  useEffect(() => {
    const lvl = args.levelId;

    if (args.phase === 'win') {
      if (handledWinLevelRef.current === lvl) return;
      handledWinLevelRef.current = lvl;
      args.runWinFlow(lvl);
      return;
    }

    if (args.phase === 'lose') {
      if (handledLoseLevelRef.current === lvl) return;
      handledLoseLevelRef.current = lvl;
      void args.runLoseFlow(lvl);
    }
  }, [args.levelId, args.phase, args.runLoseFlow, args.runWinFlow]);

  return { onDevWin, onDevLose };
}
