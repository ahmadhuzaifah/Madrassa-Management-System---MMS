import { Link } from 'react-router-dom';
import { CommunicationPageShell } from './CommunicationPageShell';

const links = [
  ['/communication/announcements', 'Announcements'],
  ['/communication/templates', 'Templates'],
  ['/communication/groups', 'Groups'],
  ['/communication/send', 'Send'],
  ['/communication/scheduled', 'Scheduled'],
  ['/communication/history', 'History'],
  ['/communication/providers', 'Providers'],
];

export function CommunicationHomePage() {
  return <CommunicationPageShell title="Communication Hub" description="Publish announcements, send messages, and manage provider settings."><div className="grid-cards">{links.map(([to, label]) => <Link key={to} to={to} className="card-link">{label}</Link>)}</div></CommunicationPageShell>;
}
