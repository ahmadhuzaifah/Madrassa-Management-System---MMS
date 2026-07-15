import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Student } from '../../types/app';

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');

  const load = async (query = '') => {
    const response = await api.get<{ students: Student[] }>(`/api/students${query ? `?search=${encodeURIComponent(query)}` : ''}`);
    setStudents(response.students);
  };

  useEffect(() => { void load(); }, []);

  return <section className="panel"><h3>Students</h3><div className="button-row"><input className="input" placeholder="Search students" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="primary-button" onClick={() => void load(search)}>Search</button><Link className="ghost-button" to="/students/admission">New admission</Link></div><div className="list-view">{students.length ? students.map((student) => <Link key={student.id} to={`/students/${student.id}`} className="mini-card"><strong>{student.fullName}</strong><span>{student.registrationNumber}</span><span>{student.status}</span></Link>) : <p>No students yet.</p>}</div></section>;
}
