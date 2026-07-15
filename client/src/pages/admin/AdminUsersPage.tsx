import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types/app';

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const loadUsers = async (query = '') => {
    const response = await api.get<{ users: User[] }>(`/api/admin/users${query ? `?search=${encodeURIComponent(query)}` : ''}`);
    setUsers(response.users);
  };
  useEffect(() => { void loadUsers(); }, []);
  return (
    <section className="panel">
      <h3>Users</h3>
      <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users" />
      <button className="primary-button" onClick={() => void loadUsers(search)}>Filter</button>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>{users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.status}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
