import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export function MembersPage() {
  const { organization, inviteMember, removeMember } = useAppContext();
  const [email, setEmail] = useState('');

  return (
    <section className="panel">
      <h3>Members</h3>
      <div className="dashboard-grid">
        <input placeholder="Invite email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="primary-button" onClick={() => inviteMember({ email })}>Invite member</button>
      </div>
      <div className="list-view">
        {organization?.members?.map((member) => (
          <div key={member.id} className="mini-card">
            <strong>{member.user.name}</strong>
            <p>{member.user.email}</p>
            <span>{member.role}</span>
            <button className="ghost-button" onClick={() => removeMember(member.user.id)}>Remove</button>
          </div>
        )) ?? null}
      </div>
    </section>
  );
}
