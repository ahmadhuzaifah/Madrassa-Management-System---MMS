import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  useEffect(() => { void api.get<{ classes: any[] }>('/api/madrassa/classes').then((r) => setClasses(r.classes)); }, []);
  return <section className="panel"><h3>Classes</h3>{classes.map((item) => <div key={item.id} className="mini-card"><strong>{item.name}</strong><span>{item.teacherName ?? 'No teacher'}</span></div>)}</section>;
}
