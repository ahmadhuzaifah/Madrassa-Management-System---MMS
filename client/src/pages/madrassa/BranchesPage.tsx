import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [name, setName] = useState('');
  useEffect(() => { void api.get<{ branches: any[] }>('/api/madrassa/branches').then((r) => setBranches(r.branches)); }, []);
  const create = async () => { await api.post('/api/madrassa/branches', { name }); const r = await api.get<{ branches: any[] }>('/api/madrassa/branches'); setBranches(r.branches); setName(''); };
  return <section className="panel"><h3>Branches</h3><div className="button-row"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Branch name" /><button className="primary-button" onClick={() => void create()}>Add branch</button></div>{branches.length ? branches.map((branch) => <div key={branch.id} className="mini-card"><strong>{branch.name}</strong><span>{branch.isActive ? 'Active' : 'Inactive'}</span></div>) : <p>No branches yet.</p>}</section>;
}
