import { LibraryPageShell } from './LibraryPageShell';

export function LibraryIssuesPage() {
  return <LibraryPageShell title="Issues" description="Issue books, calculate due dates, and track returns."><div className="empty-state">No issues recorded yet.</div></LibraryPageShell>;
}
