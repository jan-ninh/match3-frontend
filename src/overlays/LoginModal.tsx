import { useState } from 'react';
import Modal from '@/components/Modal';

type Props = {
  onClose: () => void;
  onSwitchToRegister: () => void;
};

export default function LoginModal({ onClose, onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: connect to backend auth later
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Log in" size="sm" closeOnBackdrop={true}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button type="submit" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          Log in
        </button>

        <button type="button" onClick={onSwitchToRegister} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10">
          create new account
        </button>
      </form>
    </Modal>
  );
}
