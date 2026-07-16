import { LibraryPageShell } from './LibraryPageShell';

export function LibraryCategoriesPage() {
  return <LibraryPageShell title="Categories" description="Organize books by subject or collection."><div className="empty-state">No categories yet.</div></LibraryPageShell>;
}
