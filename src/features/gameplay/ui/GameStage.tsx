import type { ReactNode, RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { SettingsGearButton } from './hud/widgets/SettingsGearButton';

type Props = { gridRowRef?: RefObject<HTMLDivElement | null>; grid: ReactNode; hud: ReactNode };

// Fit the presentation, retaining the grid's native pixel coordinates and engine geometry.
export function GameStage({ gridRowRef: externalGridRowRef, grid, hud }: Props) {
  const internalGridRowRef = useRef<HTMLDivElement | null>(null);
  const gridRowRef = externalGridRowRef ?? internalGridRowRef;
  const slotRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const slot = slotRef.current,
      native = gridRowRef.current,
      frame = frameRef.current;
    if (!slot || !native || !frame) return;
    const fit = () => {
      const width = native.offsetWidth,
        height = native.offsetHeight;
      if (!width || !height) return;
      const scale = Math.min(1, slot.clientWidth / width, slot.clientHeight / height);
      native.style.transform = `scale(${scale})`;
      frame.style.width = `${width * scale}px`;
      frame.style.height = `${height * scale}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(slot);
    observer.observe(native);
    return () => observer.disconnect();
  }, [gridRowRef]);
  return (
    <div className="game-stage">
      <div className="game-hud-container">
        {hud}
        <div className="game-settings">
          <SettingsGearButton iconSrc="/icons/settings-gear02.png" />
        </div>
      </div>
      <div ref={slotRef} className="board-slot">
        <div ref={frameRef} className="board-frame">
          <div ref={gridRowRef} className="board-native">
            {grid}
          </div>
        </div>
      </div>
    </div>
  );
}
