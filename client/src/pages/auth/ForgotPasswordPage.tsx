import { Link } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { AuthCard } from '../../components/auth/AuthCard';
import { useAppContext } from '../../context/AppContext';

const schema = z.object({ email: z.string().email() });

export function ForgotPasswordPage() {
  const { forgotPassword, status } = useAppContext();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AuthCard title="Reset your password" subtitle="We’ll send a reset token if the email exists." footer={<Link to="/login">Back to login</Link>}>
      {status ? <div className="status-banner">{status}</div> : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = schema.safeParse({ email });
          if (!parsed.success) {
            setErrors(parsed.error.issues.map((issue) => issue.message));
            return;
          }
          setErrors([]);
          setSubmitting(true);
          try {
            await forgotPassword(parsed.data.email);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.map((error) => <div key={error} className="form-error">{error}</div>)}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send reset token'}</button>
      </form>
    </AuthCard>
  );
}
