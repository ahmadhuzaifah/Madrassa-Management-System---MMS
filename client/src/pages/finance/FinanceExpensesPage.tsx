import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { FinanceExpense } from '../../types/app';
export function FinanceExpensesPage() {
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [form, setForm] = useState({ categoryName: '', amount: 0, paymentMethod: 'CASH' as FinanceExpense['paymentMethod'], paidTo: '', invoiceNumber: '', expenseDate: '', remarks: '' });
  const load = async () => setExpenses((await api.get<{ expenses: FinanceExpense[] }>('/api/finance/expenses')).expenses);
  useEffect(() => { void load(); }, []);
  return <section className="panel"><h3>Expenses</h3><div className="dashboard-grid"><input className="input" placeholder="Category" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} /><input className="input" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /><input className="input" placeholder="Paid to" value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} /><input className="input" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /><button className="primary-button" onClick={async () => { await api.post('/api/finance/expenses', form); await load(); }}>Save expense</button></div><div className="list-view">{expenses.map((expense) => <div key={expense.id} className="mini-card"><strong>{expense.category?.name ?? expense.paidTo}</strong><span>{expense.amount}</span></div>)}</div></section>;
}
