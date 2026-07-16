import { LibraryPageShell } from './LibraryPageShell';

export function LibraryBookDetailPage() {
  return <LibraryPageShell title="Book detail" description="Review a book record, its copies, and issue history."><div className="empty-state">Select a book to view copies, issues, and fines.</div></LibraryPageShell>;
}
