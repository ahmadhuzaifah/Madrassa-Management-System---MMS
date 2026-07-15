import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { InventoryCategory } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  useEffect(() => { void api.get<{ categories: InventoryCategory[] }>('/api/inventory/categories').then((data) => setCategories(data.categories)); }, []);
  return <InventoryPageShell title="Categories" description="Group assets and inventory items."><div className="data-table">{categories.map((category) => <div key={category.id} className="table-row"><strong>{category.name}</strong><span>{category.description ?? 'No description'}</span></div>)}</div></InventoryPageShell>;
}
