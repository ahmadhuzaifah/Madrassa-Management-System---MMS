import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const initialState = { fullName: '', fatherName: '', grandfatherName: '', dateOfBirth: '', gender: '', phone: '', guardianPhone: '', email: '', address: '', city: '', province: '', branchId: '', departmentId: '', programId: '', classRoomId: '', sectionId: '', academicYearId: '', guardianName: '', guardianRelationship: '', guardianEmail: '', guardianPhoneField: '' };

export function StudentAdmissionPage() {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const submit = async () => {
    const response = await api.post<{ student: { id: string } }>('/api/students/admission', { ...form, guardian: form.guardianName ? { name: form.guardianName, relationship: form.guardianRelationship, email: form.guardianEmail, phone: form.guardianPhoneField } : undefined });
    setMessage('Student admitted successfully.');
    navigate(`/students/${response.student.id}`);
  };
  return <section className="panel"><h3>New admission</h3>{message ? <div className="status-banner">{message}</div> : null}<div className="dashboard-grid">{Object.entries(form).map(([key, value]) => <input key={key} className="input" placeholder={key} value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}</div><button className="primary-button" onClick={() => void submit()}>Save admission</button></section>;
}
