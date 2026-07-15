import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import type { Student } from '../../types/app';

export function DailyAttendancePage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [branchId, setBranchId] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'>>({});
  const [message, setMessage] = useState('');

  const loadStudents = async () => {
    const response = await api.get<{ students: Student[] }>(`/api/students${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`);
    setStudents(response.students);
    setStatusMap(Object.fromEntries(response.students.map((student) => [student.id, 'PRESENT'])));
  };

  useEffect(() => { void loadStudents(); }, []);

  return (
    <section className="panel">
      <h3>Daily attendance</h3>
      {message ? <div className="status-banner">{message}</div> : null}
      <div className="dashboard-grid">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input" placeholder="Branch ID" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
        <input className="input" placeholder="Class ID" value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} />
        <input className="input" placeholder="Section ID" value={sectionId} onChange={(e) => setSectionId(e.target.value)} />
        <button className="primary-button" onClick={loadStudents}>Load students</button>
      </div>
      <div className="list-view">
        {students.map((student) => (
          <div key={student.id} className="mini-card">
            <strong>{student.fullName}</strong>
            <span>{student.registrationNumber}</span>
            <select className="input" value={statusMap[student.id] ?? 'PRESENT'} onChange={(e) => setStatusMap({ ...statusMap, [student.id]: e.target.value as any })}>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="LEAVE">Leave</option>
            </select>
          </div>
        ))}
      </div>
      <button
        className="primary-button"
        onClick={async () => {
          const payload = {
            date,
            branchId: branchId || null,
            classRoomId: classRoomId || null,
            sectionId: sectionId || null,
            records: students.map((student) => ({ studentId: student.id, status: statusMap[student.id] ?? 'PRESENT' })),
          };
          await api.post('/api/attendance', payload);
          setMessage('Attendance saved successfully.');
        }}
      >
        Save attendance
      </button>
    </section>
  );
}
