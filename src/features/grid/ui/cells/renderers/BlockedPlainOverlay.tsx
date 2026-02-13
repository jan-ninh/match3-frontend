import type { CSSProperties } from 'react';

type Props = {
  spriteStyle?: CSSProperties;
};

export function BlockedPlainOverlay({ spriteStyle }: Props) {
  if (!spriteStyle) return null;
  return <div className="absolute inset-0 rounded-xl opacity-95" style={spriteStyle} />;
}
