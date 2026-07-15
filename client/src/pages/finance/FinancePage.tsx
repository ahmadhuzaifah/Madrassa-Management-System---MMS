import { Link } from 'react-router-dom';
export function FinancePage() {
  return <section className="panel"><h3>Finance</h3><div className="button-row"><Link className="ghost-button" to="/finance/accounts">Accounts</Link><Link className="ghost-button" to="/finance/transactions">Transactions</Link><Link className="ghost-button" to="/finance/expenses">Expenses</Link><Link className="ghost-button" to="/finance/donations">Donations</Link><Link className="ghost-button" to="/finance/reports">Reports</Link></div></section>;
}
