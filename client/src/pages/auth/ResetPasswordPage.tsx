import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { AuthCard } from '../../components/auth/AuthCard';
import { useAppContext } from '../../context/AppContext';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(12),
});

export function ResetPasswordPage() {
  const { resetPassword, status } = useAppContext();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ token: params.get('token') ?? '', password: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthCard title="Set a new password" subtitle="Use the token from your email to finish the reset." footer={<Link to="/login">Back to login</Link>}>
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
            await resetPassword(parsed.data.token, parsed.data.password);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input placeholder="Reset token" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
        <input placeholder="New password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {errors.map((error) => <div key={error} className="form-error">{error}</div>)}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Reset password'}</button>
      </form>
    </AuthCard>
  );
}
