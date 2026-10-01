// src/features/gameplay/lib/outcome/expPreview.ts
// src/features/gameplay/lib/outcome/expPreview.ts
import type { PlayerMeta } from './playerMeta';

export type ExpPreview = {
  fromLevel: number;
  fromExpTotal: number;
  toLevel: number;
  toExpTotal: number;
  expRequired: number;
  expDelta: number;
};

export function buildExpPreview(args: {
  enabled: boolean;
  fromLevel: number;
  fromExpTotal: number;
  didReportBackend: boolean;
  postMeta: PlayerMeta | null;
  expWinDelta: number;
  expRequired: number;
}): { expPreview: ExpPreview | undefined; didLevelUp: boolean } {
  if (!args.enabled) return { expPreview: undefined, didLevelUp: false };
  const verifiedPost = args.didReportBackend ? args.postMeta : null;

  const gained =
    Math.floor((args.fromExpTotal + args.expWinDelta) / args.expRequired) - Math.floor(args.fromExpTotal / args.expRequired);

  const toLevel = verifiedPost ? verifiedPost.playerLevel : args.fromLevel + Math.max(0, gained);
  const toExpTotal = verifiedPost ? verifiedPost.playerExp : args.fromExpTotal + args.expWinDelta;

  const rawDelta = Math.max(0, toExpTotal - args.fromExpTotal);

  const expPreview: ExpPreview = {
    fromLevel: args.fromLevel,
    fromExpTotal: args.fromExpTotal,
    toLevel,
    toExpTotal,
    expRequired: args.expRequired,
    expDelta: rawDelta > 0 ? rawDelta : args.expWinDelta,
  };

  return { expPreview, didLevelUp: expPreview.toLevel > expPreview.fromLevel };
}
