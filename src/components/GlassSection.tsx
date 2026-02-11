// src/components/dashboard/GlassSection.tsx
import type { ReactNode } from 'react';
import { DASHBOARD_STYLE as S } from '@/components';

type Props = {
  children: ReactNode;
  className?: string;

  /** default: true */
  scanlines?: boolean;

  /** default: "padded" */
  variant?: 'padded' | 'flat';
};

export default function GlassSection({ children, className = '', scanlines = true, variant = 'padded' }: Props) {
  const padding = variant === 'padded' ? S.glass.padding : '';
  const scan = scanlines ? S.fx.scanlines : '';

  return <div className={[S.glass.panel, padding, scan, className].filter(Boolean).join(' ')}>{children}</div>;
}
