import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { AdminSetting } from '../../types/app';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  useEffect(() => { void api.get<{ settings: AdminSetting[] }>('/api/admin/settings').then((response) => setSettings(response.settings)); }, []);
  return <section className="panel"><h3>System settings</h3>{settings.length ? settings.map((setting) => <p key={setting.id}><strong>{setting.key}</strong>: {setting.value}</p>) : <p>No settings configured.</p>}</section>;
}
