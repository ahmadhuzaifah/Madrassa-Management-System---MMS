import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { FeeAssignment, FeeStructure, Student } from '../../types/app';

export function FeeAssignmentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [studentId, setStudentId] = useState('');
  const [feeStructureId, setFeeStructureId] = useState('');
  const [amount, setAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [assignments, setAssignments] = useState<FeeAssignment[]>([]);

  const load = async () => {
    const [studentResponse, structureResponse] = await Promise.all([api.get<{ students: Student[] }>('/api/students'), api.get<{ structures: FeeStructure[] }>('/api/fees/structures')]);
    setStudents(studentResponse.students);
    setStructures(structureResponse.structures);
  };

  useEffect(() => { void load(); }, []);

  return (
    <section className="panel">
      <h3>Fee assignments</h3>
      <div className="dashboard-grid">
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select>
        <select className="input" value={feeStructureId} onChange={(e) => setFeeStructureId(e.target.value)}><option value="">Select fee structure</option>{structures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name}</option>)}</select>
        <input className="input" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <input className="input" type="number" placeholder="Discount" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} />
        <button className="primary-button" onClick={async () => {
          const response = await api.post<{ assignment: FeeAssignment }>(`/api/fees/student/${studentId}/assign`, { feeStructureId, amount, discountAmount, startDate: new Date().toISOString() });
          setAssignments([response.assignment, ...assignments]);
        }}>Assign fee</button>
      </div>
      <div className="list-view">{assignments.map((assignment) => <div key={assignment.id} className="mini-card"><strong>{assignment.feeStructure?.name ?? 'Assignment'}</strong><span>Final: {assignment.finalAmount}</span></div>)}</div>
    </section>
  );
}
