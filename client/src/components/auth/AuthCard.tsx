import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="panel auth-panel">
      <div className="auth-copy">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="auth-card">
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </div>
    </section>
  );
}
