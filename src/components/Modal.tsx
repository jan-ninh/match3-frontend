// src/components/BaseModal.tsx
import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
};

export default function BaseModal({ open, title, onClose, children, size = 'md', closeOnBackdrop = true }: Props) {
  if (!open) return null;

  /// Size classes for the modal container
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined}>
      <div
        className={`relative w-full ${sizeClasses[size]} mx-4 p-8 rounded-2xl bg-linear-to-b from-purple-950/50 to-black/70 backdrop-blur-xl border border-cyan-500/30 shadow-lg text-cyan-100`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        {title && (
          <h1 className="text-3xl font-black tracking-widest uppercase text-center mb-10 bg-linear-to-r from-cyan-400 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg">
            {title}
          </h1>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
