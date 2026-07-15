import { Link } from 'react-router-dom';

export function FeesPage() {
  return (
    <section className="panel">
      <h3>Fees</h3>
      <div className="button-row">
        <Link className="ghost-button" to="/fees/structures">Fee structures</Link>
        <Link className="ghost-button" to="/fees/assignments">Assignments</Link>
        <Link className="ghost-button" to="/fees/payments">Payments</Link>
        <Link className="ghost-button" to="/fees/reports">Reports</Link>
      </div>
      <div className="card-grid">
        <div className="mini-card"><strong>Collection</strong><span>Track payments, invoices, and dues</span></div>
        <div className="mini-card"><strong>Receipts</strong><span>Generate printable receipts after every payment</span></div>
      </div>
    </section>
  );
}
