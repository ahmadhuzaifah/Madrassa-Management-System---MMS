import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <section className="panel auth-panel">
      <div className="auth-copy">
        <h3>Unauthorized</h3>
        <p>You do not have access to this page.</p>
      </div>
      <div className="auth-card">
        <Link className="primary-button" to="/login">Go to login</Link>
      </div>
    </section>
  );
}
