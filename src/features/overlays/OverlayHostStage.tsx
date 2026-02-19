import { useContext } from 'react';

import { OverlayContext } from './overlayContext';

import SettingsModal from './SettingsModal';
import WinOverlay from './WinOverlay';
import LoseOverlay from './LoseOverlay';
import QuitConfirmModal from './QuitConfirmModal';
import PowerChoiceModal from './PowerChoiceModal';

/**
 * Stage-bounded overlays (belong to the game/stage):
 * - Win / Lose / PowerChoice / Settings / QuitConfirm
 *
 * NOTE: This host must be rendered INSIDE the stage container.
 */
export default function OverlayHostStage() {
  const ctx = useContext(OverlayContext);
  if (!ctx) return null;

  const { active, data, api, powerChoiceOnChooseRef } = ctx;
  const is = (name: typeof active) => active === name;

  const noop = () => {};

  return (
    <>
      <SettingsModal open={is('settings')} onClose={api.close} />
      <WinOverlay open={is('win')} onClose={api.close} level={data.level} />
      <LoseOverlay open={is('lose')} onClose={api.close} level={data.level} />
      <QuitConfirmModal open={is('quitConfirm')} onClose={api.close} />

      <PowerChoiceModal
        open={is('powerChoice')}
        title={data.powerChoiceTitle ?? 'Choose your Power!'}
        onClose={noop}
        onChoose={(powerId) => {
          // Capture handler BEFORE close() clears the ref.
          const onChoose = powerChoiceOnChooseRef.current;
          api.close();
          onChoose?.(powerId);
        }}
      />
    </>
  );
}
