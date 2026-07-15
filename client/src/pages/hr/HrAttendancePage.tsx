import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { EmployeeAttendance } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrAttendancePage() {
  const [records, setRecords] = useState<EmployeeAttendance[]>([]);
  useEffect(() => { void api.get<{ attendance: EmployeeAttendance[] }>('/api/hr/attendance').then((data) => setRecords(data.attendance)); }, []);
  return <HrPageShell title="Attendance" description="Track check-ins, check-outs, and monthly attendance."><div className="data-table">{records.map((record) => <div key={record.id} className="table-row"><strong>{record.employee?.firstName ?? 'Employee'}</strong><span>{record.status} · {record.attendanceDate}</span></div>)}</div></HrPageShell>;
}
