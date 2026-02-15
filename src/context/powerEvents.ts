import type { PowerKey } from '@/types';

export const POWER_ARM_EVENT = 'match3:powerArm' as const;
export const POWER_GRANT_EVENT = 'match3:powerGrant' as const;
export const POWER_CONSUME_EVENT = 'match3:powerConsume' as const;
export const POWER_USE_AT_EVENT = 'match3:powerUseAt' as const;

export type PowerArmDetail = Readonly<{
  key: PowerKey;
  armed: boolean;
}>;

export type PowerGrantDetail = Readonly<{
  key: PowerKey;
  delta: number;
}>;

export type PowerConsumeDetail = Readonly<{
  key: PowerKey;
  amount: number;
  requestId?: number;
}>;

export type PowerUseAtDetail = Readonly<{
  key: PowerKey;
  target: Readonly<{ x: number; y: number }>;
  requestId?: number;
}>;
