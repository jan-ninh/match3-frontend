import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;

  onClose?: () => void;

  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  size?: ModalSize;

  className?: string;
};

function sizeClass(size: ModalSize): string {
  switch (size) {
    case 'sm':
      return 'w-[360px]';
    case 'md':
      return 'w-[480px]';
    case 'lg':
      return 'w-[720px]';
    default:
      return 'w-[480px]';
  }
}

export default function Modal({ open, title, children, onClose, closeOnBackdrop = true, showCloseButton = true, size = 'md', className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);

    // focus panel (simple, no full trap)
    queueMicrotask(() => {
      panelRef.current?.focus();
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!portalTarget) return null;

  const overlayClasses = [
    'fixed inset-0 z-[9999] flex items-center justify-center',
    'transition-opacity duration-150',
    open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
  ].join(' ');

  const backdropClasses = 'absolute inset-0 bg-black/60';

  const panelClasses = [
    'relative z-10 rounded-xl bg-neutral-800 text-white shadow-xl outline-none',
    'max-h-[85vh] overflow-auto',
    'p-4',
    sizeClass(size),
    className ?? '',
  ].join(' ');

  const onBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div className={overlayClasses} aria-hidden={!open}>
      <div className={backdropClasses} />
      <div className="absolute inset-0" onMouseDown={onBackdropMouseDown} />

      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" className={panelClasses}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">{title ?? ''}</div>

          {showCloseButton && (
            <button type="button" onClick={onClose} className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50">
              ✕
            </button>
          )}
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>,
    portalTarget,
  );
}
