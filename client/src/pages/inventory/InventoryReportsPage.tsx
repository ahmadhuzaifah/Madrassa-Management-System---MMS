import { InventoryPageShell } from './InventoryPageShell';

export function InventoryReportsPage() {
  return <InventoryPageShell title="Reports" description="Asset register, stock report, purchase report, and maintenance report."><div className="mini-grid"><div className="mini-card">Asset register</div><div className="mini-card">Stock report</div><div className="mini-card">Low stock report</div><div className="mini-card">Maintenance report</div></div></InventoryPageShell>;
}
