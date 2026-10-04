// src/components/BaseModal.tsx
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  panelClassName?: string;
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function BaseModal({ open, title, onClose, children, size = 'md', closeOnBackdrop = true, panelClassName = '' }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const root = panel.current;
    root?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !root) return;
      const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]')];
      const first = controls[0];
      const last = controls.at(-1);

      if (!first) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {
        event.preventDefault();
        first.focus();
      }
    };

    root?.addEventListener('keydown', trap);
    return () => {
      root?.removeEventListener('keydown', trap);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeOnBackdrop ? onClose : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
        >
          <motion.div
            ref={panel}
            tabIndex={-1}
            aria-labelledby={title ? titleId : undefined}
            className={`modal-panel relative w-full ${sizeClasses[size]} mx-4 p-8 rounded-2xl bg-linear-to-b from-purple-950/50 to-black/70 backdrop-blur-xl border border-cyan-500/30 shadow-lg text-cyan-100 ${panelClassName}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ borderColor: 'rgba(103, 232, 249, 0.72)' }}
            animate={{ borderColor: 'rgba(6, 182, 212, 0.30)' }}
            exit={{ borderColor: 'rgba(103, 232, 249, 0.55)' }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
          >
            {title && (
              <h1
                id={titleId}
                className="text-3xl font-black tracking-widest uppercase text-center mb-5 bg-linear-to-r from-cyan-400 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-lg"
              >
                {title}
              </h1>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
