import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Supplier } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventorySuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  useEffect(() => { void api.get<{ suppliers: Supplier[] }>('/api/inventory/suppliers').then((data) => setSuppliers(data.suppliers)); }, []);
  return <InventoryPageShell title="Suppliers" description="Track vendor records and purchase history."><div className="data-table">{suppliers.map((supplier) => <div key={supplier.id} className="table-row"><strong>{supplier.name}</strong><span>{supplier.phone ?? supplier.email ?? 'No contact'}</span></div>)}</div></InventoryPageShell>;
}
