import { useState } from 'react';
import Modal from '@/components/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsModal({ open, onClose }: Props) {
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(70);
  const [graphics, setGraphics] = useState<'low' | 'medium' | 'high'>('high');

  return (
    <Modal open={open} onClose={onClose} title="Settings" size="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>Sound</div>
          <button type="button" onClick={() => setSoundOn((v) => !v)} className="px-3 py-2 rounded-lg bg-black/30 hover:bg-black/50">
            {soundOn ? 'On' : 'Off'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>Volume</div>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
            <div className="w-10 text-right">{volume}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>Graphic</div>
          <select value={graphics} onChange={(e) => setGraphics(e.target.value as 'low' | 'medium' | 'high')} className="px-3 py-2 rounded-lg bg-black/30">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>Feedback</div>
          <button type="button" className="px-3 py-2 rounded-lg bg-black/30 hover:bg-black/50" onClick={() => alert('TODO: feedback flow')}>
            Open
          </button>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
