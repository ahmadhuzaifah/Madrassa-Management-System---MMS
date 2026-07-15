import { useState } from 'react';
import { api } from '../../services/api';
import type { AttendanceRecord } from '../../types/app';

export function AttendanceReportsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [daily, setDaily] = useState<{ records: AttendanceRecord[]; summary: { present: number; absent: number; late: number; leave: number; percentage: number } } | null>(null);
  const [monthly, setMonthly] = useState<{ records: AttendanceRecord[] } | null>(null);

  return (
    <section className="panel">
      <h3>Attendance reports</h3>
      <div className="dashboard-grid">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="primary-button" onClick={async () => setDaily(await api.get(`/api/attendance/reports/daily?date=${encodeURIComponent(date)}`))}>Daily report</button>
        <input className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
        <input className="input" value={year} onChange={(e) => setYear(e.target.value)} />
        <button className="primary-button" onClick={async () => setMonthly(await api.get(`/api/attendance/reports/monthly?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`))}>Monthly report</button>
      </div>
      <div className="card-grid">
        <div className="mini-card"><strong>Present</strong><span>{daily?.summary.present ?? 0}</span></div>
        <div className="mini-card"><strong>Absent</strong><span>{daily?.summary.absent ?? 0}</span></div>
        <div className="mini-card"><strong>Late</strong><span>{daily?.summary.late ?? 0}</span></div>
        <div className="mini-card"><strong>Leave</strong><span>{daily?.summary.leave ?? 0}</span></div>
      </div>
      <div className="list-view">
        {monthly?.records?.length ? monthly.records.map((record) => (
          <div key={record.id} className="mini-card">
            <strong>{record.student?.fullName ?? record.studentId}</strong>
            <span>{new Date(record.date).toLocaleDateString()}</span>
            <span>{record.status}</span>
          </div>
        )) : <p>No monthly report loaded.</p>}
      </div>
    </section>
  );
}
