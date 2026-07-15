import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { FeeStructure } from '../../types/app';

export function FeeStructuresPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [form, setForm] = useState({ name: '', amount: 0, frequency: 'MONTHLY' as FeeStructure['frequency'], description: '' });

  const load = async () => setStructures((await api.get<{ structures: FeeStructure[] }>('/api/fees/structures')).structures);
  useEffect(() => { void load(); }, []);

  return (
    <section className="panel">
      <h3>Fee structures</h3>
      <div className="dashboard-grid">
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as FeeStructure['frequency'] })}>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="YEARLY">Yearly</option>
          <option value="ONE_TIME">One time</option>
        </select>
        <input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="primary-button" onClick={async () => { await api.post('/api/fees/structures', form); setForm({ name: '', amount: 0, frequency: 'MONTHLY', description: '' }); await load(); }}>Create structure</button>
      </div>
      <div className="list-view">{structures.map((item) => <div key={item.id} className="mini-card"><strong>{item.name}</strong><span>{item.amount}</span><span>{item.frequency}</span></div>)}</div>
    </section>
  );
}
