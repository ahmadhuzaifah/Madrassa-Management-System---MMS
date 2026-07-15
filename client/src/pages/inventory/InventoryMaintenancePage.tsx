import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { MaintenanceRecord } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventoryMaintenancePage() {
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  useEffect(() => { void api.get<{ maintenance: MaintenanceRecord[] }>('/api/inventory/maintenance').then((data) => setMaintenance(data.maintenance)); }, []);
  return <InventoryPageShell title="Maintenance" description="Track maintenance history and related expenses."><div className="data-table">{maintenance.map((item) => <div key={item.id} className="table-row"><strong>{item.issue}</strong><span>{item.status} · {item.cost}</span></div>)}</div></InventoryPageShell>;
}
