import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Asset } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventoryAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  useEffect(() => { void api.get<{ assets: Asset[] }>('/api/inventory/assets').then((data) => setAssets(data.assets)); }, []);
  return <InventoryPageShell title="Assets" description="Manage fixed assets and maintenance history."><div className="data-table">{assets.map((asset) => <Link key={asset.id} className="table-row" to={`/inventory/assets/${asset.id}`}><strong>{asset.name}</strong><span>{asset.assetCode} · {asset.status}</span></Link>)}</div></InventoryPageShell>;
}
