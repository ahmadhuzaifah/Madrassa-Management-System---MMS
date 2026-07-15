import { useState } from 'react';
import { api } from '../../services/api';
export function FinanceReportsPage() {
  const [data, setData] = useState<any>(null);
  return <section className="panel"><h3>Finance reports</h3><div className="button-row"><button className="primary-button" onClick={async () => setData({ cashbook: await api.get('/api/finance/reports/cashbook'), ledger: await api.get('/api/finance/reports/ledger'), trial: await api.get('/api/finance/reports/trial-balance'), income: await api.get('/api/finance/reports/income'), donations: await api.get('/api/finance/reports/donations') })}>Load reports</button></div>{data ? <pre>{JSON.stringify(data, null, 2)}</pre> : null}</section>;
}
