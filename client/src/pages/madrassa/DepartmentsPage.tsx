import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  useEffect(() => { void api.get<{ departments: any[] }>('/api/madrassa/departments').then((r) => setDepartments(r.departments)); }, []);
  return <section className="panel"><h3>Departments</h3>{departments.map((department) => <div key={department.id} className="mini-card"><strong>{department.name}</strong><span>{department.isActive ? 'Active' : 'Inactive'}</span></div>)}</section>;
}
