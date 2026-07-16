import { LibraryPageShell } from './LibraryPageShell';

export function LibraryMembersPage() {
  return <LibraryPageShell title="Members" description="Students and employees are available as library members."><div className="empty-state">No members loaded yet.</div></LibraryPageShell>;
}
