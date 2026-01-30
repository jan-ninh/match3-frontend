import { useState } from 'react';
import Modal from '@/components/Modal';

type Props = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

export default function RegisterModal({ onClose, onSwitchToLogin }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: validate + connect to backend later
    if (pw1 !== pw2) {
      alert('Passwords do not match');
      return;
    }
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Register" size="sm" closeOnBackdrop={true}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
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
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          autoComplete="new-password"
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Confirm Password"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
        />

        <button type="submit" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          Create account
        </button>

        <button type="button" onClick={onSwitchToLogin} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10">
          back to login
        </button>
      </form>
    </Modal>
  );
}
