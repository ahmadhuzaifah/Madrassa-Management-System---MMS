export function SettingsView({ settings, onSave, onUpload, files }: any) {
  return (
    <section className="dashboard-grid">
      <div className="panel">
        <h3>Preferences</h3>
        <p>Theme: {settings?.theme ?? 'dark'}</p>
        <p>Notifications: {settings?.notificationsEnabled ? 'Enabled' : 'Disabled'}</p>
        <div className="button-row">
          <a className="ghost-button" href="/settings/workspace">Workspace</a>
          <a className="ghost-button" href="/settings/members">Members</a>
        </div>
        <button className="primary-button" onClick={onSave}>Save preferences</button>
      </div>
      <div className="panel">
        <h3>File uploads</h3>
        <a className="ghost-button" href="/files">Open file manager</a>
        <input type="file" onChange={onUpload} />
        <ul className="list-view">
          {files.map((file: any) => <li key={file.id}><strong>{file.originalName}</strong><span>{file.mimeType}</span></li>)}
        </ul>
      </div>
    </section>
  );
}
