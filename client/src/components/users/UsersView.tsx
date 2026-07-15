export function UsersView({ users }: any) {
  return (
    <section className="panel">
      <h3>User management</h3>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
        </thead>
        <tbody>
          {users.map((user: any) => (
            <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.status}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
