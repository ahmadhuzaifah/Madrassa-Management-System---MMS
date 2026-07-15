import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { AttendanceRecord } from '../../types/app';

type DashboardResponse = {
  records: AttendanceRecord[];
  summary: { present: number; absent: number; late: number; leave: number; percentage: number };
};

export function AttendancePage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    void api.get<DashboardResponse>('/api/attendance/reports/daily?date=' + new Date().toISOString().slice(0, 10)).then(setDashboard);
  }, []);

  return (
    <section className="panel">
      <div className="button-row">
        <h3>Attendance</h3>
        <Link className="ghost-button" to="/attendance/daily">Daily marking</Link>
        <Link className="ghost-button" to="/attendance/reports">Reports</Link>
        <Link className="ghost-button" to="/attendance/leaves">Leave requests</Link>
      </div>
      <div className="card-grid">
        <div className="mini-card"><strong>Present</strong><span>{dashboard?.summary.present ?? 0}</span></div>
        <div className="mini-card"><strong>Absent</strong><span>{dashboard?.summary.absent ?? 0}</span></div>
        <div className="mini-card"><strong>Late</strong><span>{dashboard?.summary.late ?? 0}</span></div>
        <div className="mini-card"><strong>Attendance %</strong><span>{dashboard ? `${dashboard.summary.percentage.toFixed(1)}%` : '0%'}</span></div>
      </div>
      <div className="list-view">
        {dashboard?.records?.length ? dashboard.records.map((record) => (
          <div key={record.id} className="mini-card">
            <strong>{record.student?.fullName ?? record.studentId}</strong>
            <span>{new Date(record.date).toLocaleDateString()}</span>
            <span>{record.status}</span>
          </div>
        )) : <p>No attendance yet.</p>}
      </div>
    </section>
  );
}
