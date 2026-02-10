import { useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import CyberButton from '@/components/CyberButton';
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
  const inputBase =
    'w-full px-3 py-2 rounded-lg text-cyan-100 placeholder:text-cyan-300/60 border border-pink-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400/70 disabled:opacity-60';
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
        <input className={inputBase} placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
        <input
          className={inputBase}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={loading}
        />
        {error && <div className="text-sm text-pink-400">{error}</div>}
        <div className="flex justify-center">
          <CyberButton type="submit" size="md" className="" label={`${loading ? 'Logging in...' : 'Log in'}`} />
        </div>
        <div className="flex justify-center">
          <CyberButton type="button" onClick={onSwitchToRegister} size="md" className="" disabled={loading} label="New Account" />
        </div>
      </form>
    </Modal>
  );
}
