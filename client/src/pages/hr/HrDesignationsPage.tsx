import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import type { HrDepartment, HrDesignation } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrDesignationsPage() {
  const [designations, setDesignations] = useState<HrDesignation[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const load = async () => {
    const [designationData, departmentData] = await Promise.all([
      api.get<{ designations: HrDesignation[] }>('/api/hr/designations'),
      api.get<{ departments: HrDepartment[] }>('/api/hr/departments'),
    ]);
    setDesignations(designationData.designations);
    setDepartments(departmentData.departments);
    setDepartmentId((current) => current || departmentData.departments[0]?.id || '');
  };
  useEffect(() => { void load(); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/hr/designations', { title, departmentId }); setTitle(''); await load(); };
  return <HrPageShell title="Designations" description="Set HR titles by department."><form onSubmit={submit} className="inline-form"><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Designation title" /><button className="primary-button">Add</button></form><div className="data-table">{designations.map((item) => <div key={item.id} className="table-row"><strong>{item.title}</strong><span>{item.department?.name ?? 'No department'}</span></div>)}</div></HrPageShell>;
}
