import { useAppContext } from '../../context/AppContext';

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, notificationCount } = useAppContext();
  return (
    <section className="panel">
      <h3>Notifications</h3>
      <p>Unread: {notificationCount}</p>
      <button className="ghost-button" onClick={markAllNotificationsRead}>Mark all as read</button>
      <div className="list-view">
        {notifications.length === 0 ? <p>No notifications yet.</p> : notifications.map((item) => (
          <div key={item.id} className="mini-card">
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>{item.createdAt ?? ''}</small>
            <span>{item.isRead ? 'Read' : 'Unread'}</span>
            <div className="button-row">
              <button className="ghost-button" onClick={() => markNotificationRead(item.id)}>Mark read</button>
              <button className="ghost-button" onClick={() => deleteNotification(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
