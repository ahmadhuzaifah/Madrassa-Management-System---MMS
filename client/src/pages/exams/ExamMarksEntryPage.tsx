import { useState } from 'react';
import { api } from '../../services/api';

export function ExamMarksEntryPage() {
  const [form, setForm] = useState({ examId: '', studentId: '', subjectId: '', obtainedMarks: 0, remarks: '' });
  return <section className="panel"><h3>Marks entry</h3><div className="dashboard-grid"><input className="input" placeholder="Exam ID" value={form.examId} onChange={(e) => setForm({ ...form, examId: e.target.value })} /><input className="input" placeholder="Student ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /><input className="input" placeholder="Subject ID" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} /><input className="input" type="number" placeholder="Obtained marks" value={form.obtainedMarks} onChange={(e) => setForm({ ...form, obtainedMarks: Number(e.target.value) })} /><input className="input" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /><button className="primary-button" onClick={async () => { await api.post(`/api/exams/${form.examId}/results`, { results: [{ studentId: form.studentId, subjectId: form.subjectId, obtainedMarks: form.obtainedMarks, remarks: form.remarks }] }); }}>Save marks</button></div></section>;
}
