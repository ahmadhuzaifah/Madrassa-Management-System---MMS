import { Building2, FileCheck2, ShieldCheck } from 'lucide-react';

export function AuthView({ authMode, setAuthMode, authForm, setAuthForm, onSubmit }: any) {
  return (
    <section className="panel auth-panel">
      <div className="auth-copy">
        <h3>Secure, modern SaaS operations</h3>
        <p>Manage subscriptions, users, logs, files, and reporting from one premium experience.</p>
        <div className="feature-list">
          <div><ShieldCheck size={16} /> RBAC and audit logs</div>
          <div><Building2 size={16} /> Multi-plan billing workflow</div>
          <div><FileCheck2 size={16} /> Secure uploads and exports</div>
        </div>
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="switcher">
          <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
          <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
        </div>
        {authMode === 'register' ? <input placeholder="Full name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /> : null}
        <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
        <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
        <button className="primary-button" type="submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </section>
  );
}
