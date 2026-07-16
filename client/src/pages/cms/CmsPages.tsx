import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function CmsShellPage({ title, endpoint }: { title: string; endpoint: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void api.get(endpoint).then(setData).catch(() => setData({ error: 'Unable to load' }));
  }, [endpoint]);
  return <section className="panel"><p className="eyebrow">CMS</p><h3>{title}</h3><pre className="code-block">{JSON.stringify(data, null, 2)}</pre></section>;
}

export function PublicPage({ slug, title }: { slug: string; title: string }) {
  const [page, setPage] = useState<any>(null);
  useEffect(() => {
    void api.get(`/api/cms/public/${slug}`).then(setPage).catch(() => setPage({ page: { title, slug, sections: [] } }));
  }, [slug, title]);
  return <main className="content"><section className="panel"><p className="eyebrow">{title}</p><h1>{page?.page?.title ?? title}</h1><pre className="code-block">{JSON.stringify(page, null, 2)}</pre></section></main>;
}
