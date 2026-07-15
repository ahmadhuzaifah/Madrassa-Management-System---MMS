import { Link } from 'react-router-dom';
import { HrPageShell } from './HrPageShell';

const links = [
  ['/hr/employees', 'Employees'],
  ['/hr/departments', 'Departments'],
  ['/hr/designations', 'Designations'],
  ['/hr/attendance', 'Attendance'],
  ['/hr/leaves', 'Leave requests'],
  ['/hr/payroll', 'Payroll'],
  ['/hr/reports', 'Reports'],
];

export function HrHomePage() {
  return <HrPageShell title="Human Resources" description="Manage employees, attendance, leave, and payroll.">
    <div className="grid-cards">{links.map(([to, label]) => <Link key={to} to={to} className="card-link">{label}</Link>)}</div>
  </HrPageShell>;
}
