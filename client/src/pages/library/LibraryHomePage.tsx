import { Link } from 'react-router-dom';
import { LibraryPageShell } from './LibraryPageShell';

const links = [
  ['/library/books', 'Books'],
  ['/library/categories', 'Categories'],
  ['/library/authors', 'Authors'],
  ['/library/publishers', 'Publishers'],
  ['/library/members', 'Members'],
  ['/library/issues', 'Issues'],
  ['/library/reports', 'Reports'],
];

export function LibraryHomePage() {
  return <LibraryPageShell title="Library Hub" description="Manage books, copies, members, issues, returns, and fines."><div className="grid-cards">{links.map(([to, label]) => <Link key={to} to={to} className="card-link">{label}</Link>)}</div></LibraryPageShell>;
}
