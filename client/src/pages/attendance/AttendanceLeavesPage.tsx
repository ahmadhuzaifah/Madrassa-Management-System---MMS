import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { LeaveRequest } from '../../types/app';

export function AttendanceLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [studentId, setStudentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reason, setReason] = useState('');

  const load = async () => {
    const response = await api.get<{ leaves: LeaveRequest[] }>('/api/attendance/leaves');
    setLeaves(response.leaves);
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="panel">
      <h3>Leave requests</h3>
      <div className="dashboard-grid">
        <input className="input" placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
        <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="primary-button" onClick={async () => { await api.post('/api/attendance/leaves', { studentId, dateFrom, dateTo, reason }); await load(); }}>Submit leave request</button>
      </div>
      <div className="list-view">
        {leaves.length ? leaves.map((leave) => (
          <div key={leave.id} className="mini-card">
            <strong>{leave.student?.fullName ?? leave.studentId}</strong>
            <span>{new Date(leave.dateFrom).toLocaleDateString()} - {new Date(leave.dateTo).toLocaleDateString()}</span>
            <span>{leave.reason}</span>
          </div>
        )) : <p>No leave requests yet.</p>}
      </div>
    </section>
  );
}
