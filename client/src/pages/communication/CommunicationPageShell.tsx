import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function CommunicationPageShell({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section className="panel">
      <p className="eyebrow">Communication center</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="button-row">
        <Link className="ghost-button" to="/communication/announcements">Announcements</Link>
        <Link className="ghost-button" to="/communication/templates">Templates</Link>
        <Link className="ghost-button" to="/communication/messages">Messages</Link>
        <Link className="ghost-button" to="/communication/groups">Groups</Link>
        <Link className="ghost-button" to="/communication/send">Send</Link>
        <Link className="ghost-button" to="/communication/scheduled">Scheduled</Link>
        <Link className="ghost-button" to="/communication/history">History</Link>
        <Link className="ghost-button" to="/communication/providers">Providers</Link>
      </div>
      {children}
    </section>
  );
}
