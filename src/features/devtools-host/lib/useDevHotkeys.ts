import { useEffect } from 'react';

type Args = {
  enabled: boolean;
  onToggle: () => void;
};

export function useDevHotkeys({ enabled, onToggle }: Args) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;

      if (isTyping) return;

      if (e.key === 'd' || e.key === 'D') onToggle();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onToggle]);
}