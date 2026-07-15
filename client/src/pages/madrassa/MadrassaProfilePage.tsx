import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function MadrassaProfilePage() {
  const [madrassa, setMadrassa] = useState<any>(null);
  const [form, setForm] = useState({ name: '', registrationNo: '', address: '', phone: '', email: '', website: '', principalName: '', establishmentYear: '', description: '' });

  useEffect(() => { void api.get<{ madrassa: any }>('/api/madrassa/profile').then((response) => { setMadrassa(response.madrassa); if (response.madrassa) setForm({ ...form, ...response.madrassa, establishmentYear: response.madrassa.establishmentYear ? String(response.madrassa.establishmentYear) : '' }); }); }, []);

  const save = async () => { const response = await api.put<{ madrassa: any }>('/api/madrassa/profile', { ...form, establishmentYear: form.establishmentYear ? Number(form.establishmentYear) : null }); setMadrassa(response.madrassa); };

  return <section className="panel"><h3>Madrassa profile</h3><div className="dashboard-grid">{Object.entries(form).map(([key, value]) => <input key={key} className="input" placeholder={key} value={value as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}</div><button className="primary-button" onClick={() => void save()}>Save profile</button><pre>{JSON.stringify(madrassa, null, 2)}</pre></section>;
}
