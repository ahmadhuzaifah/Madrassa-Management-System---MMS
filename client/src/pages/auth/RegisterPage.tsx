import { Link } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { AuthCard } from '../../components/auth/AuthCard';
import { useAppContext } from '../../context/AppContext';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(12),
});

export function RegisterPage() {
  const { submitAuth, status } = useAppContext();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthCard title="Create your account" subtitle="Set up access and verify your email to continue.">
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
            await submitAuth('register', parsed.data);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {errors.map((error) => <div key={error} className="form-error">{error}</div>)}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</button>
      </form>
      <Link to="/login">Already have an account?</Link>
    </AuthCard>
  );
}
