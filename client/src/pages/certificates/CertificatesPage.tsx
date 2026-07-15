import { Link } from 'react-router-dom';

export function CertificatesPage() {
  return <section className="panel"><h3>Certificates</h3><div className="button-row"><Link className="ghost-button" to="/certificates/templates">Templates</Link><Link className="ghost-button" to="/certificates/generate">Generate</Link></div><div className="card-grid"><div className="mini-card"><strong>Issued</strong><span>Track generated certificates</span></div><div className="mini-card"><strong>Verification</strong><span>Public certificate verification</span></div></div></section>;
}
