import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Employee } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  useEffect(() => { void api.get<{ employees: Employee[] }>('/api/hr/employees').then((data) => setEmployees(data.employees)); }, []);
  return <HrPageShell title="Employees" description="View the workforce directory and open employee profiles."><div className="data-table">{employees.map((employee) => <Link key={employee.id} className="table-row" to={`/hr/employees/${employee.id}`}><strong>{employee.firstName} {employee.lastName}</strong><span>{employee.employeeNumber}</span></Link>)}</div><Link className="primary-button" to="/hr/employees/new">New employee</Link></HrPageShell>;
}
