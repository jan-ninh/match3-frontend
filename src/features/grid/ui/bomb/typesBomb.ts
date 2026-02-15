export { POWER_ARM_EVENT, POWER_USE_AT_EVENT } from '@/context/powerEvents';

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
