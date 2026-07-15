import { useAppContext } from '../../context/AppContext';

export function ActivityPage() {
  const { activityLogs } = useAppContext();
  return (
    <section className="panel">
      <h3>Activity history</h3>
      <div className="list-view">
        {activityLogs.length === 0 ? <p>No activity yet.</p> : activityLogs.map((log) => (
          <div key={log.id} className="mini-card">
            <strong>{log.action}</strong>
            <p>{log.entityType}</p>
            <small>{log.createdAt}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
