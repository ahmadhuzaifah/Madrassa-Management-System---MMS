import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function TimetablePage() {
  const [timetables, setTimetables] = useState<any[]>([]);
  useEffect(() => { void api.get<{ timetables: any[] }>('/api/madrassa/timetable').then((r) => setTimetables(r.timetables)); }, []);
  return <section className="panel"><h3>Timetable</h3>{timetables.map((item) => <div key={item.id} className="mini-card"><strong>{item.day}</strong><span>{item.timeSlot}</span></div>)}</section>;
}
