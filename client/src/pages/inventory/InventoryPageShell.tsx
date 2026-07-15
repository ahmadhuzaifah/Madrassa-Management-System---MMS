import type { ReactNode } from 'react';

export function InventoryPageShell({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Inventory & assets</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
