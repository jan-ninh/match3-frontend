import { useCallback, useEffect, useRef, useState } from 'react';

import { getAudioContext, primeAudioOutput, resumeAudioContextIfNeeded } from './audioContext';

export type UseAudioKeepaliveArgs = Readonly<{
  enabled: boolean;
}>;

type KeepaliveNodes = Readonly<{
  osc: OscillatorNode;
  gain: GainNode;
}>;

export function useAudioKeepalive({ enabled }: UseAudioKeepaliveArgs): void {
  const nodesRef = useRef<KeepaliveNodes | null>(null);

  const [visible, setVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis, { capture: true });

    return () => document.removeEventListener('visibilitychange', onVis, { capture: true } as AddEventListenerOptions);
  }, []);

  const stopKeepalive = useCallback(() => {
    const cur = nodesRef.current;
    if (!cur) return;

    nodesRef.current = null;

    try {
      cur.osc.stop();
    } catch {
      // ignore
    }

    try {
      cur.osc.disconnect();
      cur.gain.disconnect();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled || !visible) {
      stopKeepalive();
      return;
    }

    const c = getAudioContext();
    if (!c) {
      stopKeepalive();
      return;
    }

    // keepalive is only meaningful when the context is allowed to run
    resumeAudioContextIfNeeded();

    // already running?
    if (nodesRef.current) return;

    try {
      const gain = c.createGain();

      // extremely low (effectively silent, but keeps the graph alive)
      gain.gain.value = 0.00001;

      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 30;

      osc.connect(gain);
      gain.connect(c.destination);

      osc.start();

      nodesRef.current = { osc, gain };

      // ensure output path is actually awake
      primeAudioOutput();
    } catch {
      stopKeepalive();
    }
  }, [enabled, visible, stopKeepalive]);

  useEffect(() => stopKeepalive, [stopKeepalive]);
}
