import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import type { HrDepartment } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrDepartmentsPage() {
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [name, setName] = useState('');
  const load = async () => setDepartments((await api.get<{ departments: HrDepartment[] }>('/api/hr/departments')).departments);
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/hr/departments', { name }); setName(''); await load(); };
  return <HrPageShell title="Departments" description="Manage HR departments."><form onSubmit={submit} className="inline-form"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Department name" /><button className="primary-button">Add</button></form><div className="data-table">{departments.map((item) => <div key={item.id} className="table-row"><strong>{item.name}</strong><span>{item.description ?? 'No description'}</span></div>)}</div></HrPageShell>;
}
