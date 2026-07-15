import { HrPageShell } from './HrPageShell';

export function HrReportsPage() {
  return <HrPageShell title="Reports" description="Employee, attendance, leave, and payroll summaries."><div className="mini-grid"><div className="mini-card">Employee directory</div><div className="mini-card">Attendance report</div><div className="mini-card">Leave report</div><div className="mini-card">Payroll report</div></div></HrPageShell>;
}
