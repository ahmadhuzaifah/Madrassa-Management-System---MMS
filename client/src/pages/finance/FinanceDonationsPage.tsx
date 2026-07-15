import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { FinanceDonation } from '../../types/app';
export function FinanceDonationsPage() {
  const [donations, setDonations] = useState<FinanceDonation[]>([]);
  const [form, setForm] = useState({ donorName: '', donationType: 'GENERAL' as FinanceDonation['donationType'], amount: 0, paymentMethod: 'CASH' as FinanceDonation['paymentMethod'], date: '', purpose: '' });
  const load = async () => setDonations((await api.get<{ donations: FinanceDonation[] }>('/api/finance/donations')).donations);
  useEffect(() => { void load(); }, []);
  return <section className="panel"><h3>Donations</h3><div className="dashboard-grid"><input className="input" placeholder="Donor name" value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} /><input className="input" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /><select className="input" value={form.donationType} onChange={(e) => setForm({ ...form, donationType: e.target.value as FinanceDonation['donationType'] })}><option>GENERAL</option><option>ZAKAT</option><option>SADAQAH</option><option>LILLAH</option><option>FITRANA</option><option>QURBANI</option><option>SPONSORSHIP</option></select><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><button className="primary-button" onClick={async () => { await api.post('/api/finance/donations', form); await load(); }}>Save donation</button></div><div className="list-view">{donations.map((donation) => <div key={donation.id} className="mini-card"><strong>{donation.donorName}</strong><span>{donation.receiptNumber}</span><span>{donation.amount}</span></div>)}</div></section>;
}
