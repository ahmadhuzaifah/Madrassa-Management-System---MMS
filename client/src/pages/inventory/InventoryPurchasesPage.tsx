import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Purchase } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventoryPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  useEffect(() => { void api.get<{ purchases: Purchase[] }>('/api/inventory/purchases').then((data) => setPurchases(data.purchases)); }, []);
  return <InventoryPageShell title="Purchases" description="Record purchases and optional finance postings."><div className="data-table">{purchases.map((purchase) => <div key={purchase.id} className="table-row"><strong>{purchase.invoiceNumber}</strong><span>{purchase.paymentStatus} · {purchase.totalAmount}</span></div>)}</div></InventoryPageShell>;
}
