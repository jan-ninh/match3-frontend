import { useMemo, useState } from 'react';
import { Modal, AvatarSprite, CyberButton } from '@/components';
import { PICKABLE_AVATARS, type AvatarKey } from '@/assets/avatarsFrames';
import { apiUpdateAvatar } from '@/api/user';
import { motion } from 'framer-motion';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentAvatar?: AvatarKey;
  onUpdated?: (next: AvatarKey) => void; //
};

export default function ChangeAvatarModal({ open, onClose, userId, currentAvatar = 'default.png', onUpdated }: Props) {
  const initial = useMemo<AvatarKey>(() => currentAvatar, [currentAvatar]);
  const [selected, setSelected] = useState<AvatarKey | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = !!selected && selected !== initial && selected !== 'default.png' && !saving;

  const handleSave = async () => {
    if (!canSave || !selected) return;
    setSaving(true);
    setError(null);
    try {
      await apiUpdateAvatar(userId, selected as Exclude<AvatarKey, 'default.png'>);
      // Await the onUpdated callback to ensure profile is refreshed before closing
      await onUpdated?.(selected);
      onClose();
    } catch (e) {
      setError('Failed to update avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Change Avatar">
      <div className="text-center">
        <div className="flex items-center justify-between gap-3"></div>

        <p className="mt-2 text-sm text-white/70"> Select an Avatar then press Save </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {PICKABLE_AVATARS.map((name) => {
            const isSelected = selected === name;
            const MotionButton = motion.button;

            return (
              <MotionButton
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                initial={false}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                animate={isSelected ? { scale: 1.04 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 20, mass: 0.7 }}
                className={[
                  'rounded-2xl p-3 border origin-center',
                  'transition-colors',
                  //border pink
                  isSelected ? 'border-pink-500 bg-white/5' : 'border-white/10',
                  // hover
                  'hover:bg-white/5',
                  // glow selected
                  'hover:shadow-[0_0_22px_rgba(34,211,238,0.25)]',
                  isSelected ? 'shadow-[0_0_26px_rgba(236,72,153,0.28)]' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-center">
                  <AvatarSprite name={name} size={96} />
                </div>
                <div className="mt-2 text-xs text-white/70">{name.replace('.png', '')}</div>
              </MotionButton>
            );
          })}
        </div>

        {error ? <div className="mt-3 text-sm text-red-400">{error}</div> : null}

        <div className="mt-5 flex items-center justify-center ">
          <CyberButton type="button" onClick={onClose} disabled={saving} label="Cancel" size="sm" />
          <CyberButton type="button" onClick={handleSave} size="sm" disabled={!canSave} label={saving ? 'Saving…' : 'Save'} />
        </div>
      </div>
    </Modal>
  );
}
