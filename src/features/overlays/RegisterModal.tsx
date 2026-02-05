import { useState } from 'react';
import Modal from '@/components/Modal';
import { apiRegister } from '@/api/auth';

type Props = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

export default function RegisterModal({ onClose, onSwitchToLogin }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Basic validation
    if (pw1 !== pw2) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);

      // Call backend register endpoint
      await apiRegister(email, username, pw1);

      // If register succeeds:
      // close register modal and switch to login
      onClose();
      onSwitchToLogin();
    } catch (err: any) {
      // Show backend or network error
      setError(err?.message ?? 'Register failed');
    } finally {
      setLoading(false);
    }
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
          required
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Password"
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          autoComplete="new-password"
          required
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Confirm Password"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          required
        />
        {/* Error message */}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <button type="button" onClick={onSwitchToLogin} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10">
          back to login
        </button>
      </form>
    </Modal>
  );
}
