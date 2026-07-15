import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export function ProfilePage() {
  const { user, updateProfile, changePassword, handleFileUpload, files, status } = useAppContext();
  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', avatarUrl: user?.avatarUrl ?? '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [avatarLabel, setAvatarLabel] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <section className="dashboard-grid">
      <div className="panel">
        <h3>Account information</h3>
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>
        <p>Status: {user?.status}</p>
        <p>Verified: {user?.emailVerified ? 'Yes' : 'No'}</p>
      </div>
      <div className="panel">
        <h3>Edit profile</h3>
        {status ? <div className="status-banner">{status}</div> : null}
        <input placeholder="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        <input placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        <input placeholder="Avatar URL" value={profile.avatarUrl} onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })} />
        <input type="file" onChange={async (event) => {
          setLoading(true);
          try {
            const file = await handleFileUpload(event);
            if (file?.path) {
              setProfile((current) => ({ ...current, avatarUrl: file.path }));
              setAvatarLabel(file.originalName);
            }
          } finally {
            setLoading(false);
          }
        }} />
        {avatarLabel ? <p>Avatar file: {avatarLabel}</p> : null}
        <button
          className="primary-button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await updateProfile({ name: profile.name, phone: profile.phone, avatarUrl: profile.avatarUrl || null });
            } finally {
              setLoading(false);
            }
          }}
        >
          Save profile
        </button>
      </div>
      <div className="panel">
        <h3>Change password</h3>
        <input placeholder="Current password" type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} />
        <input placeholder="New password" type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} />
        <button className="primary-button" onClick={async () => changePassword(password)}>Update password</button>
      </div>
      <div className="panel">
        <h3>Uploads</h3>
        <ul className="list-view">
          {files.map((file) => <li key={file.id}><strong>{file.originalName}</strong><span>{file.mimeType}</span></li>)}
        </ul>
      </div>
    </section>
  );
}
