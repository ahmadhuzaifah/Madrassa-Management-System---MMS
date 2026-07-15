import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  useEffect(() => { void api.get<{ subjects: any[] }>('/api/madrassa/subjects').then((r) => setSubjects(r.subjects)); }, []);
  return <section className="panel"><h3>Subjects</h3>{subjects.map((item) => <div key={item.id} className="mini-card"><strong>{item.name}</strong><span>{item.code ?? 'No code'}</span></div>)}</section>;
}
