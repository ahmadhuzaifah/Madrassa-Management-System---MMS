import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { ActivityLog } from '../../types/app';

export function AdminLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  useEffect(() => { void api.get<{ logs: ActivityLog[] }>('/api/admin/logs').then((response) => setLogs(response.logs)); }, []);
  return <section className="panel"><h3>Audit logs</h3>{logs.map((log) => <p key={log.id}>{log.action} · {log.entityType}</p>)}</section>;
}
