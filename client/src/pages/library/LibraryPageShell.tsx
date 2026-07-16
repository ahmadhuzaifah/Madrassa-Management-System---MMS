import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function LibraryPageShell({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section className="panel">
      <p className="eyebrow">Library management</p>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="button-row">
        <Link className="ghost-button" to="/library/books">Books</Link>
        <Link className="ghost-button" to="/library/categories">Categories</Link>
        <Link className="ghost-button" to="/library/authors">Authors</Link>
        <Link className="ghost-button" to="/library/publishers">Publishers</Link>
        <Link className="ghost-button" to="/library/members">Members</Link>
        <Link className="ghost-button" to="/library/issues">Issues</Link>
        <Link className="ghost-button" to="/library/reports">Reports</Link>
      </div>
      {children}
    </section>
  );
}
