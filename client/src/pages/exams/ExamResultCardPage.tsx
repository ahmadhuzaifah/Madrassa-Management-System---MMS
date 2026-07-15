import { useState } from 'react';
import { api } from '../../services/api';

export function ExamResultCardPage() {
  const [studentId, setStudentId] = useState('');
  const [examId, setExamId] = useState('');
  const [card, setCard] = useState<any>(null);
  return <section className="panel"><h3>Result card</h3><div className="dashboard-grid"><input className="input" placeholder="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} /><input className="input" placeholder="Exam ID" value={examId} onChange={(e) => setExamId(e.target.value)} /><button className="primary-button" onClick={async () => setCard(await api.get(`/api/exams/result-card/${studentId}/${examId}`))}>Preview card</button></div>{card ? <pre>{JSON.stringify(card, null, 2)}</pre> : null}<button className="ghost-button" onClick={() => window.print()}>Print result card</button></section>;
}
