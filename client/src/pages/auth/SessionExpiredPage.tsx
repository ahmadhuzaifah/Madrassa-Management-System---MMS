import { Link } from 'react-router-dom';

export function SessionExpiredPage() {
  return (
    <section className="panel auth-panel">
      <div className="auth-copy">
        <h3>Session expired</h3>
        <p>Your session is no longer valid. Please sign in again.</p>
      </div>
      <div className="auth-card">
        <Link className="primary-button" to="/login">Sign in</Link>
      </div>
    </section>
  );
}
