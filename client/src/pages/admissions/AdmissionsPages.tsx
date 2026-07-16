import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';

type Program = { id: string; name: string; description?: string | null; department?: { name: string } | null };
type FormField = { label: string; fieldType: string; fieldKey: string; isRequired?: boolean; options?: string[] };

function PageShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="panel">
      <p className="eyebrow">Admissions</p>
      <h3>{title}</h3>
      <p>{subtitle}</p>
      {children}
    </section>
  );
}

export function PublicAdmissionsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  useEffect(() => {
    void api.get<{ programs: Program[] }>('/api/admissions/programs').then((response) => setPrograms(response.programs)).catch(() => setPrograms([]));
  }, []);
  return (
    <PageShell title="Admissions" subtitle="Apply online for madrassa programs and track your application.">
      <div className="dashboard-grid">
        {programs.map((program) => (
          <article key={program.id} className="mini-card">
            <strong>{program.name}</strong>
            <span>{program.department?.name ?? 'General program'}</span>
            <span>{program.description ?? 'Open for applications'}</span>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

export function AdmissionApplyPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [forms, setForms] = useState<Array<{ id: string; name: string; fields: FormField[] }>>([]);
  const [message, setMessage] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  const [form, setForm] = useState<Record<string, string>>({ fullName: '', fatherName: '', email: '', phone: '', programId: '', branchId: '', guardianName: '', guardianRelationship: '' });

  useEffect(() => {
    void Promise.all([
      api.get<{ programs: Program[] }>('/api/admissions/programs'),
      api.get<{ forms: Array<{ id: string; name: string; fields: FormField[] }> }>('/api/admissions/forms'),
    ]).then(([programResponse, formResponse]) => {
      setPrograms(programResponse.programs);
      setForms(formResponse.forms);
    }).catch(() => {
      setPrograms([]);
      setForms([]);
    });
  }, []);

  const selectedForm = useMemo(() => forms[0], [forms]);

  const submit = async () => {
    const response = await api.post<{ applicant: { applicationNumber: string } }>('/api/admissions/apply', {
      ...form,
      formId: selectedForm?.id,
      guardian: form.guardianName ? { name: form.guardianName, relationship: form.guardianRelationship } : undefined,
    });
    setApplicationNumber(response.applicant.applicationNumber);
    setMessage('Application submitted successfully.');
  };

  return (
    <PageShell title="Apply Online" subtitle="Submit a new admission application and receive a tracking number.">
      {message ? <div className="status-banner">{message} {applicationNumber ? `Application: ${applicationNumber}` : ''}</div> : null}
      <div className="dashboard-grid">
        {Object.entries(form).map(([key, value]) => (
          <input key={key} className="input" placeholder={key} value={value} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
        ))}
      </div>
      <div className="dashboard-grid" style={{ marginTop: 16 }}>
        <select className="input" value={form.programId} onChange={(event) => setForm((current) => ({ ...current, programId: event.target.value }))}>
          <option value="">Select program</option>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
        </select>
        <button className="primary-button" onClick={() => void submit()}>Submit application</button>
      </div>
    </PageShell>
  );
}

export function AdmissionStatusPage() {
  const [lookup, setLookup] = useState('');
  const [result, setResult] = useState<any>(null);
  return (
    <PageShell title="Track Application" subtitle="Check your admission status using the application number.">
      <div className="button-row">
        <input className="input" placeholder="Application number" value={lookup} onChange={(event) => setLookup(event.target.value)} />
        <button className="primary-button" onClick={async () => setResult(await api.get(`/api/admissions/status/${lookup}`))}>Check status</button>
      </div>
      <pre className="code-block">{JSON.stringify(result ?? {}, null, 2)}</pre>
    </PageShell>
  );
}

export function AdmissionsAdminHomePage() {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    void api.get('/api/admissions/reports/summary').then(setSummary).catch(() => setSummary(null));
  }, []);
  return <PageShell title="Admission dashboard" subtitle="Review application flow and conversion metrics."><pre className="code-block">{JSON.stringify(summary ?? {}, null, 2)}</pre></PageShell>;
}

export function AdmissionsApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  useEffect(() => {
    void api.get<{ applications: any[] }>('/api/admissions/applications').then((response) => setApplications(response.applications)).catch(() => setApplications([]));
  }, []);
  return <PageShell title="Applications" subtitle="Search and review admission applications."><div className="list-view">{applications.map((application) => <article key={application.id} className="mini-card"><strong>{application.applicant?.fullName ?? application.applicationNumber}</strong><span>{application.status}</span><span>{application.applicationNumber}</span></article>)}</div></PageShell>;
}

export function AdmissionApplicationDetailPage() {
  const [detail, setDetail] = useState<any>(null);
  const { id } = useParams();
  useEffect(() => {
    if (!id) return;
    void api.get(`/api/admissions/applications/${id}`).then(setDetail).catch(() => setDetail(null));
  }, [id]);
  return <PageShell title="Application profile" subtitle="Review documents, interviews, decisions, and conversion."><pre className="code-block">{JSON.stringify(detail ?? {}, null, 2)}</pre></PageShell>;
}

export function AdmissionFormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [name, setName] = useState('Main Admission Form');
  useEffect(() => {
    void api.get<{ forms: any[] }>('/api/admissions/forms').then((response) => setForms(response.forms)).catch(() => setForms([]));
  }, []);
  return (
    <PageShell title="Admission forms" subtitle="Manage form templates and custom fields.">
      <div className="button-row">
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="primary-button" onClick={async () => { await api.post('/api/admissions/forms', { sessionId: forms[0]?.sessionId ?? '', name }); setForms(await api.get('/api/admissions/forms').then((response: any) => response.forms).catch(() => [])); }}>Create form</button>
      </div>
      <div className="list-view">{forms.map((formItem) => <article key={formItem.id} className="mini-card"><strong>{formItem.name}</strong><span>{formItem.status}</span><span>{formItem.fields?.length ?? 0} fields</span></article>)}</div>
    </PageShell>
  );
}

export function AdmissionReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);
  useEffect(() => {
    void Promise.all([api.get('/api/admissions/reports/summary'), api.get('/api/admissions/reports/conversion')]).then(([summaryResponse, conversionResponse]) => {
      setSummary(summaryResponse);
      setConversion(conversionResponse);
    }).catch(() => {
      setSummary(null);
      setConversion(null);
    });
  }, []);
  return <PageShell title="Admission reports" subtitle="Monitor applications, approvals, and conversion performance."><pre className="code-block">{JSON.stringify({ summary, conversion }, null, 2)}</pre></PageShell>;
}
