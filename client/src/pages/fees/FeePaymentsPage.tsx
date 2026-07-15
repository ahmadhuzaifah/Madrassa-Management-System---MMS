import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { FeeInvoice, FeePayment, Student } from '../../types/app';

export function FeePaymentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<FeePayment['paymentMethod']>('CASH');
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [invoice, setInvoice] = useState<FeeInvoice | null>(null);
  const [summary, setSummary] = useState<{ totalAssigned: number; paidAmount: number; outstanding: number } | null>(null);

  const load = async () => setStudents((await api.get<{ students: Student[] }>('/api/students')).students);
  useEffect(() => { void load(); }, []);

  const loadStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    const response = await api.get<{ summary: { totalAssigned: number; paidAmount: number; outstanding: number }; payments: FeePayment[]; invoices: FeeInvoice[] }>(`/api/fees/student/${studentId}`);
    setSummary(response.summary);
    setPayments(response.payments);
    setInvoice(response.invoices[0] ?? null);
  };

  return (
    <section className="panel">
      <h3>Payments</h3>
      <div className="dashboard-grid">
        <select className="input" value={selectedStudentId} onChange={(e) => void loadStudent(e.target.value)}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select>
        <input className="input" type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as FeePayment['paymentMethod'])}>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank</option>
          <option value="ONLINE">Online</option>
        </select>
        <button className="primary-button" disabled={!selectedStudentId} onClick={async () => {
          const response = await api.post<{ receipt: { receiptNumber: string; invoiceNumber: string } }>(`/api/fees/payments`, { studentId: selectedStudentId, amount, paymentMethod, paymentDate: new Date().toISOString() });
          await loadStudent(selectedStudentId);
          setInvoice({ id: response.receipt.invoiceNumber, invoiceNumber: response.receipt.invoiceNumber, amount, dueDate: new Date().toISOString(), status: 'PAID', studentId: selectedStudentId });
        }}>Receive payment</button>
      </div>
      {summary ? <div className="card-grid"><div className="mini-card"><strong>Total</strong><span>{summary.totalAssigned}</span></div><div className="mini-card"><strong>Paid</strong><span>{summary.paidAmount}</span></div><div className="mini-card"><strong>Outstanding</strong><span>{summary.outstanding}</span></div></div> : null}
      {invoice ? <div className="panel"><h4>Receipt / Invoice</h4><pre>{JSON.stringify(invoice, null, 2)}</pre><button className="ghost-button" onClick={() => window.print()}>Print receipt</button></div> : null}
      <div className="list-view">{payments.map((payment) => <div key={payment.id} className="mini-card"><strong>{payment.receiptNumber}</strong><span>{payment.amount}</span><span>{payment.paymentMethod}</span></div>)}</div>
    </section>
  );
}
