import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { FinanceAccount } from '../../types/app';
export function FinanceAccountsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [form, setForm] = useState({ accountCode: '', accountName: '', accountType: 'ASSET' as FinanceAccount['accountType'], openingBalance: 0 });
  const load = async () => setAccounts((await api.get<{ accounts: FinanceAccount[] }>('/api/finance/accounts')).accounts);
  useEffect(() => { void load(); }, []);
  return <section className="panel"><h3>Accounts</h3><div className="dashboard-grid"><input className="input" placeholder="Code" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} /><input className="input" placeholder="Name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} /><select className="input" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value as FinanceAccount['accountType'] })}><option>ASSET</option><option>LIABILITY</option><option>EQUITY</option><option>INCOME</option><option>EXPENSE</option></select><input className="input" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} /><button className="primary-button" onClick={async () => { await api.post('/api/finance/accounts', form); await load(); }}>Create account</button></div><div className="list-view">{accounts.map((account) => <div key={account.id} className="mini-card"><strong>{account.accountCode}</strong><span>{account.accountName}</span><span>{account.currentBalance}</span></div>)}</div></section>;
}
