import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Certificate } from '../../types/app';

export function CertificateDetailPage() {
  const { id } = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  useEffect(() => { if (!id) return; void api.get<{ certificate: Certificate }>(`/api/certificates/${id}`).then((response) => setCertificate(response.certificate)); }, [id]);
  if (!certificate) return <section className="panel">Loading certificate...</section>;
  return <section className="panel"><h3>{certificate.title}</h3><p>{certificate.certificateNumber}</p><p>{certificate.status}</p><Link className="ghost-button" to={`/verify-certificate/${certificate.verification?.verificationCode ?? certificate.certificateNumber}`}>Verify link</Link><pre>{JSON.stringify(certificate, null, 2)}</pre></section>;
}
