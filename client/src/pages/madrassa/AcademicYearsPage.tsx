import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  useEffect(() => { void api.get<{ academicYears: any[] }>('/api/madrassa/academic-years').then((r) => setAcademicYears(r.academicYears)); }, []);
  return <section className="panel"><h3>Academic years</h3>{academicYears.map((year) => <div key={year.id} className="mini-card"><strong>{year.name}</strong><span>{year.status}</span></div>)}</section>;
}
