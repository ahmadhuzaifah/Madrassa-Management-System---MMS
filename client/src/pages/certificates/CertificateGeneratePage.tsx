import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Certificate, Student } from '../../types/app';

export function CertificateGeneratePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('Completion Certificate');
  const [description, setDescription] = useState('');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  useEffect(() => { void api.get<{ students: Student[] }>('/api/students').then((response) => setStudents(response.students)); }, []);
  return <section className="panel"><h3>Generate certificate</h3><div className="dashboard-grid"><select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} /><button className="primary-button" onClick={async () => { const response = await api.post<{ certificate: Certificate }>('/api/certificates/generate', { studentId, type: 'COURSE_COMPLETION', title, description }); setCertificate(response.certificate); }}>Generate</button></div>{certificate ? <pre>{JSON.stringify(certificate, null, 2)}</pre> : null}<button className="ghost-button" onClick={() => window.print()}>Print / download</button></section>;
}
