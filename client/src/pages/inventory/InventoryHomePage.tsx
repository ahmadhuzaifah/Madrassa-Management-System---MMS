import { Link } from 'react-router-dom';
import { InventoryPageShell } from './InventoryPageShell';

const links = [
  ['/inventory/assets', 'Assets'],
  ['/inventory/items', 'Items'],
  ['/inventory/categories', 'Categories'],
  ['/inventory/suppliers', 'Suppliers'],
  ['/inventory/purchases', 'Purchases'],
  ['/inventory/maintenance', 'Maintenance'],
  ['/inventory/reports', 'Reports'],
];

export function InventoryHomePage() {
  return <InventoryPageShell title="Inventory Hub" description="Track fixed assets, items, suppliers, purchases, and maintenance."><div className="grid-cards">{links.map(([to, label]) => <Link key={to} to={to} className="card-link">{label}</Link>)}</div></InventoryPageShell>;
}
