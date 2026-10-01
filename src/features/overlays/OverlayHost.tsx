// src/features/overlays/OverlayHost.tsx
import { Suspense, lazy, useContext } from 'react';
import { OverlayContext } from './overlayContext';

import SettingsModal from './SettingsModal';
import WinOverlay from './WinOverlay';
import LoseOverlay from './LoseOverlay';
import QuitConfirmModal from './QuitConfirmModal';
import MissionReportModal from './OverlayMissionReport';
import LevelUpModal from './OverlayLevelUp';

const LoginModal = lazy(() => import('./LoginModal'));
const RegisterModal = lazy(() => import('./RegisterModal'));

function safeInt(n: unknown, fallback: number): number {
  if (typeof n !== 'number') return fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function hasLevelUpFromPreview(expPreview: unknown): boolean {
  if (!expPreview || typeof expPreview !== 'object') return false;
  const p = expPreview as { fromLevel?: unknown; toLevel?: unknown };
  const fromLevel = Math.max(1, safeInt(p.fromLevel, 1));
  const toLevel = Math.max(1, safeInt(p.toLevel, fromLevel));
  return toLevel > fromLevel;
}

export default function OverlayHost() {
  const ctx = useContext(OverlayContext);
  if (!ctx) return null;

  const { active, data, api, missionReportOnDoneRef, levelUpOnChooseRef } = ctx;
  const is = (name: typeof active) => active === name;

  const levelUpTitle = data.levelUpTitle ?? data.powerChoiceTitle ?? 'Choose your Reward!';
  const hasLevelUp = hasLevelUpFromPreview(data.expPreview);

  return (
    <>
      <SettingsModal open={is('settings')} onClose={api.close} />
      <WinOverlay open={is('win')} onClose={api.close} level={data.level} mode={data.winMode} />
      <LoseOverlay open={is('lose')} onClose={api.close} level={data.level} />
      <QuitConfirmModal open={is('quitConfirm')} onClose={api.close} />

      <MissionReportModal
        open={is('missionReport')}
        expPreview={data.expPreview}
        onClose={api.close}
        onPrimary={() => {
          if (hasLevelUp) {
            api.close();
            return;
          }
          const onDone = missionReportOnDoneRef.current;
          api.close();
          onDone?.();
        }}
      />

      {/* 'powerChoice' is a legacy alias; render LevelUp UI for both. */}
      <LevelUpModal
        open={is('levelUp') || is('powerChoice')}
        title={levelUpTitle}
        onClose={api.close}
        onChoose={(powerId) => {
          // Capture handler BEFORE close() clears the ref.
          const onChoose = levelUpOnChooseRef.current;
          api.close();
          onChoose?.(powerId);
        }}
      />

      <Suspense fallback={null}>
        {is('login') && <LoginModal onClose={() => api.closeAuth('login')} onSwitchToRegister={api.openRegister} />}
        {is('register') && <RegisterModal onClose={() => api.closeAuth('register')} onSwitchToLogin={api.openLogin} />}
      </Suspense>
    </>
  );
}
