import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { InventoryItem } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventoryItemsPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  useEffect(() => { void api.get<{ items: InventoryItem[] }>('/api/inventory/items').then((data) => setItems(data.items)); }, []);
  return <InventoryPageShell title="Items" description="Manage stock, stock levels, and movement."><div className="data-table">{items.map((item) => <div key={item.id} className="table-row"><strong>{item.name}</strong><span>{item.sku} · {item.quantity} {item.unit}</span></div>)}</div></InventoryPageShell>;
}
