import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Organization } from '../../types/app';

export function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  useEffect(() => { void api.get<{ organizations: Organization[] }>('/api/admin/organizations').then((response) => setOrganizations(response.organizations)); }, []);
  return <section className="panel"><h3>Organizations</h3>{organizations.map((org) => <div key={org.id} className="mini-card"><strong>{org.name}</strong><span>{org.members?.length ?? 0} members</span></div>)}</section>;
}
