import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { AttendanceRecord, AttendanceSummary, Student } from '../../types/app';

export function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [transfer, setTransfer] = useState({ previousBranchId: '', newBranchId: '', previousClassRoomId: '', newClassRoomId: '', reason: '' });

  const load = async () => {
    if (!id) return;
    const response = await api.get<{ student: Student }>(`/api/students/${id}`);
    setStudent(response.student);
    const attendance = await api.get<{ records: AttendanceRecord[]; summary: AttendanceSummary }>(`/api/attendance/student/${id}`);
    setAttendanceRecords(attendance.records);
    setAttendanceSummary(attendance.summary);
  };
  useEffect(() => { void load(); }, [id]);

  if (!student) return <section className="panel">Loading student...</section>;

  return (
    <section className="panel">
      <h3>{student.fullName}</h3>
      <p>{student.registrationNumber}</p>
      <div className="card-grid">
        <div className="mini-card"><strong>Personal</strong><span>{student.fatherName ?? 'No father name'}</span></div>
        <div className="mini-card"><strong>Academic</strong><span>{student.status}</span></div>
        <div className="mini-card"><strong>Attendance</strong><span>{attendanceSummary ? `${attendanceSummary.percentage.toFixed(1)}% present` : 'No attendance yet'}</span></div>
      </div>
      <div className="card-grid">
        <div className="mini-card"><strong>Total days</strong><span>{attendanceSummary?.totalDays ?? attendanceRecords.length}</span></div>
        <div className="mini-card"><strong>Present</strong><span>{attendanceSummary?.presentDays ?? 0}</span></div>
        <div className="mini-card"><strong>Absent</strong><span>{attendanceSummary?.absentDays ?? 0}</span></div>
        <div className="mini-card"><strong>Leave</strong><span>{attendanceSummary?.leaveDays ?? 0}</span></div>
      </div>
      <div className="dashboard-grid">
        <input className="input" placeholder="Document name" value={documentName} onChange={(e) => setDocumentName(e.target.value)} />
        <input className="input" placeholder="File URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
        <button className="primary-button" onClick={async () => { await api.post(`/api/students/${student.id}/documents`, { documentName, fileUrl }); await load(); }}>Upload document</button>
      </div>
      <div className="dashboard-grid">{Object.entries(transfer).map(([key, value]) => <input key={key} className="input" placeholder={key} value={value} onChange={(e) => setTransfer({ ...transfer, [key]: e.target.value })} />)}</div>
      <button className="primary-button" onClick={async () => { await api.post(`/api/students/${student.id}/transfer`, transfer); await load(); }}>Transfer student</button>
      <section className="panel" style={{ marginTop: 16 }}>
        <h4>Monthly attendance</h4>
        <div className="list-view">
          {attendanceRecords.length ? attendanceRecords.map((record) => (
            <div key={record.id} className="mini-card">
              <strong>{new Date(record.date).toLocaleDateString()}</strong>
              <span>{record.status}</span>
              <span>{record.remarks ?? 'No remarks'}</span>
            </div>
          )) : <p>No attendance records yet.</p>}
        </div>
      </section>
      <pre>{JSON.stringify({ documents: student.documents, transfers: student.transfers }, null, 2)}</pre>
    </section>
  );
}
