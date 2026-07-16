import { LibraryPageShell } from './LibraryPageShell';

export function LibraryReportsPage() {
  return <LibraryPageShell title="Reports" description="Review inventory, issues, overdue books, and fines."><div className="card-grid"><div className="mini-card"><strong>Issued books</strong><span>See current circulation</span></div><div className="mini-card"><strong>Fine collections</strong><span>Monitor overdue revenue</span></div></div></LibraryPageShell>;
}
