import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Props = { title: string; endpoint: string; summaryKey?: string };

export function PortalDataPage({ title, endpoint, summaryKey }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const response = await api.get<Record<string, unknown>>(endpoint);
        setData(response);
      } finally {
        setLoading(false);
      }
    })();
  }, [endpoint]);

  return (
    <section className="panel">
      <p className="eyebrow">{title}</p>
      <h3>{title}</h3>
      {loading ? <p>Loading portal data...</p> : (
        <>
          {summaryKey && typeof data?.[summaryKey] === 'object' && data?.[summaryKey] !== null && 'children' in (data[summaryKey] as object) ? (
            <p>{summaryKey}</p>
          ) : null}
          <pre className="code-block">{JSON.stringify(data ?? {}, null, 2)}</pre>
        </>
      )}
    </section>
  );
}
