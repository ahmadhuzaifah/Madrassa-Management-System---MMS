import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Payroll } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrPayrollPage() {
  const { id } = useParams();
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  useEffect(() => {
    if (id) {
      void api.get<{ payroll: Payroll }>(`/api/hr/payroll/${id}`).then((data) => setPayroll([data.payroll]));
      return;
    }
    void api.get<{ payroll: Payroll[] }>('/api/hr/payroll').then((data) => setPayroll(data.payroll));
  }, [id]);
  return <HrPageShell title="Payroll" description="Generate salary sheets and pay employees."><div className="data-table">{payroll.map((item) => <div key={item.id} className="table-row"><strong>{item.employee?.firstName ?? 'Employee'}</strong><span>{item.month}/{item.year} · {item.paymentStatus} · {item.netSalary}</span></div>)}</div></HrPageShell>;
}
