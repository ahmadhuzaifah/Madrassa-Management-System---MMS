import { useState } from 'react';

export function PlanBuilder({ onCreate }: any) {
  const [form, setForm] = useState({ name: '', slug: '', description: '', priceMonthly: 0, priceYearly: 0, features: '' });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onCreate({ ...form, priceMonthly: Number(form.priceMonthly), priceYearly: Number(form.priceYearly) });
      }}
    >
      <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      <input placeholder="Price monthly" type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} />
      <input placeholder="Price yearly" type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} />
      <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <textarea placeholder="Features" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
      <button className="primary-button" type="submit">Create plan</button>
    </form>
  );
}
