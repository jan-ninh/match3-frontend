import { useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { CyberButton } from '@/components';

type Props = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

export default function RegisterModal({ onClose, onSwitchToLogin }: Props) {
  const { register } = useAuth();
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

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    // Basic validation
    if (pw1 !== pw2) {
      setError('Passwords do not match');
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);

      // Call backend register endpoint
      await register(trimmedEmail, trimmedUsername, pw1);

      // If register succeeds:
      // close register modal and switch to login
      onClose();
      onSwitchToLogin();
    } catch (err: any) {
      // Show backend or network error
      const serverMessage = err?.payload?.error ?? err?.message;
      setError(serverMessage ?? 'Register failed');
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
          disabled={loading}
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Password"
          type="password"
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          autoComplete="new-password"
          required
          disabled={loading}
        />
        <input
          className="px-3 py-2 rounded-lg bg-black/30"
          placeholder="Confirm Password"
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          required
          disabled={loading}
        />
        {/* Error message */}
        {error && <div className="text-sm text-pink-800">{error}</div>}
        <div className="flex justify-center">
          <CyberButton type="submit" disabled={loading} size="md" className="" label={loading ? 'Creating account...' : 'Create Account'} />
        </div>
        <div className="flex justify-center">
          <CyberButton type="button" disabled={loading} onClick={onSwitchToLogin} size="md" className="text-md" label="Back to Log In" />
        </div>
      </form>
    </Modal>
  );
}
