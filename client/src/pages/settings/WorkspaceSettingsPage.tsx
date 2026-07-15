import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export function WorkspaceSettingsPage() {
  const { organization, updateWorkspace, status } = useAppContext();
  const [form, setForm] = useState({
    name: organization?.name ?? '',
    logoUrl: organization?.logoUrl ?? '',
    contactEmail: organization?.contactEmail ?? '',
    contactPhone: organization?.contactPhone ?? '',
    address: organization?.address ?? '',
    timezone: organization?.timezone ?? 'UTC',
    currency: organization?.currency ?? 'USD',
    language: organization?.language ?? 'en',
    primaryColor: organization?.primaryColor ?? '#0f172a',
    secondaryColor: organization?.secondaryColor ?? '#2563eb',
    appearance: organization?.appearance ?? 'system',
  });

  return (
    <section className="panel">
      <h3>Workspace settings</h3>
      {status ? <div className="status-banner">{status}</div> : null}
      <div className="dashboard-grid">
        <input placeholder="Organization name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Logo URL" value={form.logoUrl ?? ''} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
        <input placeholder="Contact email" value={form.contactEmail ?? ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        <input placeholder="Contact phone" value={form.contactPhone ?? ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        <input placeholder="Address" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        <input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        <input placeholder="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        <input placeholder="Primary color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
        <input placeholder="Secondary color" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
        <input placeholder="Appearance" value={form.appearance} onChange={(e) => setForm({ ...form, appearance: e.target.value })} />
      </div>
      <button className="primary-button" onClick={() => updateWorkspace(form)}>Save workspace</button>
    </section>
  );
}
