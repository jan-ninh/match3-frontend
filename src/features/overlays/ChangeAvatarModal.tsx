import { useMemo, useState } from 'react';
import { Modal, AvatarSprite } from '@/components';
import { PICKABLE_AVATARS, type AvatarKey } from '@/assets/avatarsFrames';
import { apiUpdateAvatar } from '@/api/user';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentAvatar?: AvatarKey;
  onUpdated?: (next: AvatarKey) => void; // برای آپدیت state در parent
};

export default function ChangeAvatarModal({ open, onClose, userId, currentAvatar = 'default.png', onUpdated }: Props) {
  const initial = useMemo<AvatarKey>(() => currentAvatar, [currentAvatar]);
  const [selected, setSelected] = useState<AvatarKey>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = selected !== initial && selected !== 'default.png' && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await apiUpdateAvatar(userId, selected as Exclude<AvatarKey, 'default.png'>);
      onUpdated?.(selected);
      onClose();
    } catch (e) {
      setError('Failed to update avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="">
        <div className="flex items-center justify-between gap-3"></div>

        <p className="mt-2 text-sm text-white/70"> Select an Avatar then press Save </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {PICKABLE_AVATARS.map((name) => {
            const isActive = selected === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={['rounded-2xl p-3 border transition', isActive ? 'border-cyan-400 bg-white/5' : 'border-white/10 hover:border-white/25'].join(' ')}
              >
                <div className="flex items-center justify-center">
                  <AvatarSprite name={name} size={84} className={isActive ? 'ring-2 ring-cyan-400/70' : ''} />
                </div>
                <div className="mt-2 text-xs text-white/70">{name.replace('.png', '')}</div>
              </button>
            );
          })}
        </div>

        {error ? <div className="mt-3 text-sm text-red-400">{error}</div> : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 h-10 rounded-xl border border-white/10 text-white/80 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 h-10 rounded-xl bg-cyan-500/80 text-slate-950 font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
