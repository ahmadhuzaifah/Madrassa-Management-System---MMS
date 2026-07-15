import { useState } from 'react';
import { api } from '../../services/api';
import type { FeePayment } from '../../types/app';

export function FeeReportsPage() {
  const [collection, setCollection] = useState<{ totalCollected: number; payments: FeePayment[] } | null>(null);
  const [outstanding, setOutstanding] = useState<{ rows: Array<{ student: { id: string; fullName: string }; due: number }> } | null>(null);

  return (
    <section className="panel">
      <h3>Fee reports</h3>
      <div className="button-row">
        <button className="primary-button" onClick={async () => setCollection(await api.get('/api/fees/reports/collection'))}>Load collection</button>
        <button className="primary-button" onClick={async () => setOutstanding(await api.get('/api/fees/reports/outstanding'))}>Load outstanding</button>
      </div>
      {collection ? <div className="card-grid"><div className="mini-card"><strong>Total collected</strong><span>{collection.totalCollected}</span></div></div> : null}
      <div className="list-view">{outstanding?.rows?.map((row) => <div key={row.student.id} className="mini-card"><strong>{row.student.fullName}</strong><span>Due: {row.due}</span></div>) ?? <p>No report loaded.</p>}</div>
    </section>
  );
}
