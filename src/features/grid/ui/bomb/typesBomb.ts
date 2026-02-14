export const POWER_ARM_EVENT = 'match3:powerArm' as const;
export const POWER_USE_AT_EVENT = 'match3:powerUseAt' as const;

export type BombPowerKey = 'bomb';

export type BombTarget = Readonly<{
  x: number;
  y: number;
}>;

export type PowerArmDetail = Readonly<{
  key: BombPowerKey;
  armed: boolean;
}>;

export type PowerUseAtDetail = Readonly<{
  key: BombPowerKey;
  target: BombTarget;
}>;
