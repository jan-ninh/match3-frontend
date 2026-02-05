import { useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
type Props = {
  onClose: () => void;
  onSwitchToRegister: () => void;
};

export default function LoginModal({ onClose, onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Successful login: close modal
      onClose();
    } catch (err: any) {
      // Show server-provided message if present
      setError(err?.message || err?.payload?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
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
          disabled={loading}
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={loading}
        />
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button type="submit" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <button type="button" onClick={onSwitchToRegister} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10" disabled={loading}>
          create new account
        </button>
      </form>
    </Modal>
  );
}
