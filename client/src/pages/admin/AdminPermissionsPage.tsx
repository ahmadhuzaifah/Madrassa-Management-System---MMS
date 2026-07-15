import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { PermissionRecord } from '../../types/app';

export function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  useEffect(() => { void api.get<{ permissions: PermissionRecord[] }>('/api/admin/permissions').then((response) => setPermissions(response.permissions)); }, []);
  return <section className="panel"><h3>Permissions</h3><div className="card-grid">{permissions.map((permission) => <div key={permission.id} className="mini-card"><strong>{permission.code}</strong><span>{permission.resource}:{permission.action}</span></div>)}</div></section>;
}
