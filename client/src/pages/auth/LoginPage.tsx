import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { AuthCard } from '../../components/auth/AuthCard';
import { useAppContext } from '../../context/AppContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

export function LoginPage() {
  const { submitAuth, status } = useAppContext();
  const location = useLocation();
  const [form, setForm] = useState({ email: (location.state as any)?.email ?? '', password: '', rememberMe: true });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to your account."
      footer={<Link to="/forgot-password">Forgot password?</Link>}
    >
      {status ? <div className="status-banner">{status}</div> : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = schema.safeParse(form);
          if (!parsed.success) {
            setErrors(parsed.error.issues.map((issue) => issue.message));
            return;
          }
          setErrors([]);
          setSubmitting(true);
          try {
            await submitAuth('login', { name: '', email: parsed.data.email, password: parsed.data.password });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="password-row">
          <input placeholder="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" className="ghost-button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        <label className="checkbox-row"><input type="checkbox" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} /> Remember me</label>
        {errors.map((error) => <div key={error} className="form-error">{error}</div>)}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <Link to="/register">Create account</Link>
    </AuthCard>
  );
}
