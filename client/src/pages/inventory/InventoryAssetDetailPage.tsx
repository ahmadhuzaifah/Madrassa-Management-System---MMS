import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { Asset } from '../../types/app';
import { InventoryPageShell } from './InventoryPageShell';

export function InventoryAssetDetailPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState<Asset | null>(null);
  useEffect(() => { if (id) void api.get<{ asset: Asset }>(`/api/inventory/assets/${id}`).then((data) => setAsset(data.asset)); }, [id]);
  return <InventoryPageShell title="Asset profile" description="View asset details and maintenance history.">{asset ? <div className="mini-grid"><div className="mini-card"><strong>{asset.name}</strong><span>{asset.assetCode}</span></div><div className="mini-card"><strong>Status</strong><span>{asset.status}</span></div><div className="mini-card"><strong>Condition</strong><span>{asset.condition}</span></div></div> : <p>Select an asset to view details.</p>}</InventoryPageShell>;
}
