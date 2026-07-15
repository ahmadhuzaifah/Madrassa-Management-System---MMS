import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Exam, ExamSubject } from '../../types/app';

export function ExamDetailPage() {
  const { id } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [subjectForm, setSubjectForm] = useState({ subjectId: '', totalMarks: 100, passingMarks: 40 });
  const load = async () => {
    if (!id) return;
    const [examResponse, subjectResponse] = await Promise.all([api.get<{ exams: Exam[] }>('/api/exams'), api.get<{ subjects: ExamSubject[] }>(`/api/exams/${id}/subjects`)]);
    setExam(examResponse.exams.find((item) => item.id === id) ?? null);
    setSubjects(subjectResponse.subjects);
  };
  useEffect(() => { void load(); }, [id]);
  if (!exam) return <section className="panel">Loading exam...</section>;
  return <section className="panel"><h3>{exam.name}</h3><div className="dashboard-grid"><input className="input" placeholder="Subject ID" value={subjectForm.subjectId} onChange={(e) => setSubjectForm({ ...subjectForm, subjectId: e.target.value })} /><input className="input" type="number" placeholder="Total marks" value={subjectForm.totalMarks} onChange={(e) => setSubjectForm({ ...subjectForm, totalMarks: Number(e.target.value) })} /><input className="input" type="number" placeholder="Passing marks" value={subjectForm.passingMarks} onChange={(e) => setSubjectForm({ ...subjectForm, passingMarks: Number(e.target.value) })} /><button className="primary-button" onClick={async () => { await api.post(`/api/exams/${exam.id}/subjects`, subjectForm); await load(); }}>Add subject</button></div><div className="list-view">{subjects.map((subject) => <div key={subject.id} className="mini-card"><strong>{subject.subjectId}</strong><span>{subject.totalMarks}</span></div>)}</div></section>;
}
