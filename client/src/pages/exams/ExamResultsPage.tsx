import { useState } from 'react';
import { api } from '../../services/api';

export function ExamResultsPage() {
  const [examId, setExamId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  return <section className="panel"><h3>Results</h3><div className="button-row"><input className="input" placeholder="Exam ID" value={examId} onChange={(e) => setExamId(e.target.value)} /><button className="primary-button" onClick={async () => setResults((await api.get<{ results: any[] }>(`/api/exams/${examId}/results`)).results)}>Load results</button></div><div className="list-view">{results.map((result) => <div key={result.id} className="mini-card"><strong>{result.student?.fullName ?? result.studentId}</strong><span>{result.subjectId}</span><span>{result.grade}</span></div>)}</div></section>;
}
