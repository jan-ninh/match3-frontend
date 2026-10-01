import { RequestError } from '@/api/transport';
import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import CyberButton from '@/components/CyberButton';
import toast from 'react-hot-toast';
import { loginSchema, type LoginFormValues } from '@/schemas/authSchemas';
import AccountServiceStatus from '@/components/AccountServiceStatus';
import { useAccountReadiness } from '@/services/network/useAccountReadiness';
import { authFailureMessage } from './authFailure';

type Props = {
  onClose: () => void;
  onSwitchToRegister: () => void;
};

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

function toFieldErrors(zodError: { issues: readonly { path: PropertyKey[]; message: string }[] }): FieldErrors {
  const out: FieldErrors = {};
  const issues = zodError?.issues ?? [];
  for (const issue of issues) {
    const key = issue.path?.[0] as keyof LoginFormValues | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export default function LoginModal({ onClose, onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const readiness = useAccountReadiness();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [form, setForm] = useState<LoginFormValues>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const inputBase =
    'w-full px-3 py-2 rounded-lg text-cyan-100 placeholder:text-cyan-300/60 border border-pink-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400/70 disabled:opacity-60 bg-black/30';

  const setField = (key: keyof LoginFormValues, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFieldErrors((p) => {
      if (!p[key]) return p;
      const copy = { ...p };
      delete copy[key];
      return copy;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || readiness !== 'ready') return;
    setServerError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errs = toFieldErrors(parsed.error);
      setFieldErrors(errs);

      return;
    }

    try {
      setLoading(true);
      await login(parsed.data.email, parsed.data.password);
      if (!mounted.current) return;
      toast.success('Welcome back!', { duration: 1200 });
      onClose();
    } catch (err: unknown) {
      if (err instanceof RequestError && err.kind === 'cancelled') return;
      if (mounted.current) setServerError(authFailureMessage(err, 'login'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Log in" size="sm" closeOnBackdrop={false}>
      <form onSubmit={submit} noValidate className="auth-form flex flex-col gap-3">
        <AccountServiceStatus />
        <div className="flex flex-col gap-1">
          <input
            className={`${inputBase} ${fieldErrors.email ? 'border-pink-400/70 ring-1 ring-pink-400/20' : ''}`}
            aria-label="Email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            disabled={loading}
          />
          {fieldErrors.email && <div className="text-xs text-pink-400">{fieldErrors.email}</div>}
        </div>

        <div className="flex flex-col gap-1">
          <input
            className={`${inputBase} ${fieldErrors.password ? 'border-pink-400/70 ring-1 ring-pink-400/20' : ''}`}
            aria-label="Password"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />
          {fieldErrors.password && <div className="text-xs text-pink-400">{fieldErrors.password}</div>}
        </div>

        <div className="flex justify-center">
          <CyberButton type="submit" size="md" disabled={loading || readiness !== 'ready'} label={loading ? 'Logging in...' : 'Log in'} />
        </div>

        <div className="flex justify-center">
          <CyberButton type="button" onClick={onSwitchToRegister} size="md" disabled={loading} label="New Account" />
          <CyberButton type="button" onClick={onClose} size="md" disabled={loading} label="Cancel" />
        </div>
        {serverError && (
          <div className="text-sm text-pink-300" role="alert">
            <p>{serverError}</p>
            <button type="button" className="underline" onClick={() => setServerError(null)}>
              Dismiss error
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
