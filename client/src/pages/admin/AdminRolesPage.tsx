import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { RoleRecord } from '../../types/app';

export function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  useEffect(() => { void api.get<{ roles: RoleRecord[] }>('/api/admin/roles').then((response) => setRoles(response.roles)); }, []);
  return <section className="panel"><h3>Roles</h3>{roles.map((role) => <div key={role.id} className="mini-card"><strong>{role.name}</strong><span>{role.slug}</span></div>)}</section>;
}
