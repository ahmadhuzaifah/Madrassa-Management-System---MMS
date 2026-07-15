import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { CertificateTemplate } from '../../types/app';

export function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [form, setForm] = useState({ name: '', type: 'CUSTOM', templateContent: 'Certificate for {{studentName}}' });
  const load = async () => setTemplates((await api.get<{ templates: CertificateTemplate[] }>('/api/certificates/templates')).templates);
  useEffect(() => { void load(); }, []);
  return <section className="panel"><h3>Certificate templates</h3><div className="dashboard-grid"><input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="HIFZ_COMPLETION">Hifz</option><option value="TAJWEED_COMPLETION">Tajweed</option><option value="COURSE_COMPLETION">Course</option><option value="CHARACTER_CERTIFICATE">Character</option><option value="LEAVING_CERTIFICATE">Leaving</option><option value="CUSTOM">Custom</option></select><textarea className="input" value={form.templateContent} onChange={(e) => setForm({ ...form, templateContent: e.target.value })} /><button className="primary-button" onClick={async () => { await api.post('/api/certificates/templates', form); await load(); }}>Save template</button></div><div className="list-view">{templates.map((template) => <div key={template.id} className="mini-card"><strong>{template.name}</strong><span>{template.type}</span></div>)}</div></section>;
}
