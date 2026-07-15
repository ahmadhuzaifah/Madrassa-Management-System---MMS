import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function AdminReportsPage() {
  const [reports, setReports] = useState<any>(null);
  useEffect(() => { void api.get<{ reports: any }>('/api/admin/reports').then((response) => setReports(response.reports)); }, []);
  return <section className="panel"><h3>Reports</h3><pre>{JSON.stringify(reports, null, 2)}</pre></section>;
}
