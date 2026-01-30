import { Suspense, lazy, useContext } from 'react';
import { OverlayContext } from './overlayContext';

import SettingsModal from './SettingsModal';
import WinOverlay from './WinOverlay';
import LoseOverlay from './LoseOverlay';
import QuitConfirmModal from './QuitConfirmModal';
import PowerChoiceModal from './PowerChoiceModal';

const LoginModal = lazy(() => import('./LoginModal'));
const RegisterModal = lazy(() => import('./RegisterModal'));

export default function OverlayHost() {
  const ctx = useContext(OverlayContext);
  if (!ctx) return null;

  const { active, data, api, powerChoiceOnChooseRef } = ctx;

  const is = (name: typeof active) => active === name;

  // Always-mounted (toggle)
  return (
    <>
      <SettingsModal open={is('settings')} onClose={api.close} />

      <WinOverlay open={is('win')} onClose={api.close} level={data.level} />

      <LoseOverlay open={is('lose')} onClose={api.close} level={data.level} />

      <QuitConfirmModal open={is('quitConfirm')} onClose={api.close} />

      <PowerChoiceModal
        open={is('powerChoice')}
        title={data.powerChoiceTitle ?? 'Choose your Power!'}
        onClose={api.close}
        onChoose={(powerId) => {
          powerChoiceOnChooseRef.current?.(powerId);
          api.close();
        }}
      />

      {/* Lazy-mounted (auth/app-like) */}
      <Suspense fallback={null}>
        {is('login') && <LoginModal onClose={api.close} onSwitchToRegister={api.openRegister} />}
        {is('register') && <RegisterModal onClose={api.close} onSwitchToLogin={api.openLogin} />}
      </Suspense>
    </>
  );
}
