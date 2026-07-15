import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  useEffect(() => { void api.get<{ programs: any[] }>('/api/madrassa/programs').then((r) => setPrograms(r.programs)); }, []);
  return <section className="panel"><h3>Programs</h3>{programs.map((program) => <div key={program.id} className="mini-card"><strong>{program.name}</strong><span>{program.status}</span></div>)}</section>;
}
