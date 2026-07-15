import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { HrLeave } from '../../types/app';
import { HrPageShell } from './HrPageShell';

export function HrLeavesPage() {
  const [leaves, setLeaves] = useState<HrLeave[]>([]);
  useEffect(() => { void api.get<{ leaves: HrLeave[] }>('/api/hr/leaves').then((data) => setLeaves(data.leaves)); }, []);
  return <HrPageShell title="Leave requests" description="Review, approve, and track employee leave."><div className="data-table">{leaves.map((leave) => <div key={leave.id} className="table-row"><strong>{leave.leaveType}</strong><span>{leave.status} · {leave.reason}</span></div>)}</div></HrPageShell>;
}
