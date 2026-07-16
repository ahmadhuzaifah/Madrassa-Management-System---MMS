import { LibraryPageShell } from './LibraryPageShell';

export function LibraryBooksPage() {
  return <LibraryPageShell title="Books" description="Track titles, copies, authors, publishers, and availability."><div className="card-grid"><div className="mini-card"><strong>Inventory</strong><span>List books and copies with availability</span></div><div className="mini-card"><strong>Search</strong><span>Find by title, ISBN, author, or barcode</span></div></div></LibraryPageShell>;
}
