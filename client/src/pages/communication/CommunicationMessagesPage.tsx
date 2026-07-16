import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CommunicationPageShell } from './CommunicationPageShell';

type Message = { id: string; subject?: string | null; content: string; channel: string; status: string; sentAt?: string | null };

export function CommunicationMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await api.get<{ messages: Message[] }>('/communication/messages');
      setMessages(response.messages ?? []);
    })();
  }, []);

  return (
    <CommunicationPageShell title="Messages" description="Track sent communication messages across channels.">
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Sent</th>
            </tr>
          </thead>
          <tbody>
            {messages.length ? messages.map((message) => (
              <tr key={message.id}>
                <td>{message.subject ?? 'Untitled'}</td>
                <td>{message.channel}</td>
                <td>{message.status}</td>
                <td>{message.sentAt ?? 'Pending'}</td>
              </tr>
            )) : <tr><td colSpan={4}>No messages yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </CommunicationPageShell>
  );
}
