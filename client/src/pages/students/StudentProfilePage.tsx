import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Student } from '../../types/app';

export function StudentProfilePage() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [transfer, setTransfer] = useState({ previousBranchId: '', newBranchId: '', previousClassRoomId: '', newClassRoomId: '', reason: '' });

  const load = async () => { if (!id) return; const response = await api.get<{ student: Student }>(`/api/students/${id}`); setStudent(response.student); };
  useEffect(() => { void load(); }, [id]);

  if (!student) return <section className="panel">Loading student...</section>;

  return <section className="panel"><h3>{student.fullName}</h3><p>{student.registrationNumber}</p><div className="card-grid"><div className="mini-card"><strong>Personal</strong><span>{student.fatherName ?? 'No father name'}</span></div><div className="mini-card"><strong>Academic</strong><span>{student.status}</span></div></div><div className="dashboard-grid"><input className="input" placeholder="Document name" value={documentName} onChange={(e) => setDocumentName(e.target.value)} /><input className="input" placeholder="File URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} /><button className="primary-button" onClick={async () => { await api.post(`/api/students/${student.id}/documents`, { documentName, fileUrl }); await load(); }}>Upload document</button></div><div className="dashboard-grid">{Object.entries(transfer).map(([key, value]) => <input key={key} className="input" placeholder={key} value={value} onChange={(e) => setTransfer({ ...transfer, [key]: e.target.value })} />)}</div><button className="primary-button" onClick={async () => { await api.post(`/api/students/${student.id}/transfer`, transfer); await load(); }}>Transfer student</button><pre>{JSON.stringify({ documents: student.documents, transfers: student.transfers }, null, 2)}</pre></section>;
}
