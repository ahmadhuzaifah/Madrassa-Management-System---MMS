import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Employee } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrEmployeeDetailPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  useEffect(() => { if (id) void api.get<{ employee: Employee }>(`/api/hr/employees/${id}`).then((data) => setEmployee(data.employee)); }, [id]);
  return <HrPageShell title={id ? 'Employee profile' : 'New employee'} description="Employee details, salary history, and documents.">{employee ? <div className="mini-grid"><div className="mini-card"><strong>Name</strong><span>{employee.firstName} {employee.lastName}</span></div><div className="mini-card"><strong>Number</strong><span>{employee.employeeNumber}</span></div><div className="mini-card"><strong>Status</strong><span>{employee.status}</span></div></div> : <p>Use the employee forms and lists to manage records.</p>}</HrPageShell>;
}
