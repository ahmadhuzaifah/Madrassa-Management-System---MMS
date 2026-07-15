import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { AuthCard } from '../../components/auth/AuthCard';
import { useAppContext } from '../../context/AppContext';

const schema = z.object({ token: z.string().min(1), email: z.string().email() });

export function VerifyEmailPage() {
  const { verifyEmail, resendVerification, user, status } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: '', email: (location.state as any)?.email ?? user?.email ?? '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthCard title="Verify your email" subtitle="Enter the verification token sent to your inbox." footer={<Link to="/login">Back to login</Link>}>
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
            await verifyEmail(parsed.data.token);
            navigate('/dashboard', { replace: true });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Verification token" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
        {errors.map((error) => <div key={error} className="form-error">{error}</div>)}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Verifying...' : 'Verify email'}</button>
      </form>
      <button className="ghost-button" type="button" onClick={() => resendVerification(form.email)}>Resend email</button>
    </AuthCard>
  );
}
