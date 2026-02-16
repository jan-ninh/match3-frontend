import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { CyberButton } from '@/components';
import { registerSchema, type RegisterFormValues } from '@/schemas/authSchemas';
import toast from 'react-hot-toast';

type Props = {
  onClose: () => void;
  onSwitchToLogin: () => void;
};

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

function toFieldErrors(zodError: any): FieldErrors {
  const out: FieldErrors = {};
  const issues = zodError?.issues ?? [];
  for (const issue of issues) {
    const key = issue.path?.[0] as keyof RegisterFormValues | undefined;
    if (key && !out[key]) out[key] = issue.message; // first error per field
  }
  return out;
}

export default function RegisterModal({ onClose, onSwitchToLogin }: Props) {
  const { register } = useAuth();

  const [form, setForm] = useState<RegisterFormValues>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const hasErrors = useMemo(() => Object.keys(fieldErrors).length > 0, [fieldErrors]);

  const setField = (key: keyof RegisterFormValues, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    // clear the error for that field when user edits
    setFieldErrors((p) => {
      if (!p[key]) return p;
      const copy = { ...p };
      delete copy[key];
      return copy;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = registerSchema.safeParse(form);

    if (!parsed.success) {
      const errs = toFieldErrors(parsed.error);
      setFieldErrors(errs);

      // toast all errors (or just the first one)
      // const messages = Object.values(errs).filter(Boolean) as string[];
      // messages.forEach((m) => toast.error(m));

      return;
    }

    try {
      setLoading(true);

      const { email, username, password } = parsed.data;

      await register(email, username, password);

      toast.success('Account created. Please log in.');
      onClose();
      onSwitchToLogin();
    } catch (err: any) {
      const serverMessage = err?.payload?.error ?? err?.message ?? 'Register failed.';
      toast.error(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Register" size="sm" closeOnBackdrop={true}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <input
            className="px-3 py-2 rounded-lg bg-black/30"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setField('username', e.target.value)}
            autoComplete="username"
            disabled={loading}
          />
          {fieldErrors.username && <div className="text-xs text-pink-400">{fieldErrors.username}</div>}
        </div>

        <div className="flex flex-col gap-1">
          <input
            className="px-3 py-2 rounded-lg bg-black/30"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
          {fieldErrors.email && <div className="text-xs text-pink-400">{fieldErrors.email}</div>}
        </div>

        <div className="flex flex-col gap-1">
          <input
            className="px-3 py-2 rounded-lg bg-black/30"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          {fieldErrors.password && <div className="text-xs text-pink-400">{fieldErrors.password}</div>}
        </div>

        <div className="flex flex-col gap-1">
          <input
            className="px-3 py-2 rounded-lg bg-black/30"
            placeholder="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setField('confirmPassword', e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          {fieldErrors.confirmPassword && <div className="text-xs text-pink-400">{fieldErrors.confirmPassword}</div>}
        </div>

        <div className="flex justify-center pt-1">
          <CyberButton type="submit" disabled={loading} size="md" label={loading ? 'Creating account...' : 'Create Account'} />
        </div>

        <div className="flex justify-center">
          <CyberButton type="button" disabled={loading} onClick={onSwitchToLogin} size="md" label="Back to Log In" />
        </div>

        {/* optional: if you want a single "you have errors" line */}
        {hasErrors && <div className="text-xs text-white/60 text-center">Please fix the highlighted fields.</div>}
      </form>
    </Modal>
  );
}
