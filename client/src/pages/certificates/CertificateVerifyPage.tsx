import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';

export function CertificateVerifyPage() {
  const { code } = useParams();
  const [verification, setVerification] = useState<any>(null);
  useEffect(() => { if (!code) return; void api.get(`/api/certificates/verify/${code}`).then(setVerification).catch(() => setVerification({ error: 'Certificate not found' })); }, [code]);
  return <section className="panel"><h3>Verify certificate</h3>{verification ? <pre>{JSON.stringify(verification, null, 2)}</pre> : <p>Loading...</p>}</section>;
}
