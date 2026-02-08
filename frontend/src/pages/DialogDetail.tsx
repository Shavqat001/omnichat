import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import './DialogDetail.css';

interface Message {
  id: number;
  content: string;
  sender_type: string;
  operator_name?: string;
  created_at: string;
  edited: boolean;
  content_type: string;
  file_url?: string;
}

interface Dialog {
  id: number;
  channel_name: string;
  client_name: string;
  status: string;
  rating: number;
  participants: any[];
}

const DialogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDialog();
    fetchMessages();
    const socket = getSocket();
    if (socket && id) {
      socket.emit('dialog:join', { dialogId: parseInt(id) });
      socket.on(`dialog:${id}:message`, handleNewMessage);
      socket.on(`dialog:${id}:message:updated`, handleMessageUpdated);
    }
    return () => {
      if (socket && id) {
        socket.emit('dialog:leave', { dialogId: parseInt(id) });
        socket.off(`dialog:${id}:message`);
        socket.off(`dialog:${id}:message:updated`);
      }
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDialog = async () => {
    try {
      const response = await api.get(`/dialogs/${id}`);
      setDialog(response.data);
    } catch (error) {
      console.error('Failed to fetch dialog:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/messages/dialog/${id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleMessageUpdated = (message: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? message : m))
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await api.post('/messages', {
        dialogId: id,
        content: newMessage,
        contentType: 'text'
      });
      setNewMessage('');
      // Сообщение уже придет через WebSocket, но можно добавить локально для мгновенного отображения
      // handleNewMessage(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка отправки сообщения');
    }
  };

  const handleCloseDialog = async () => {
    try {
      await api.post(`/dialogs/${id}/close`);
      toast.success('Диалог закрыт');
      navigate('/dialogs');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка закрытия диалога');
    }
  };

  const handleMarkSpam = async () => {
    try {
      await api.post(`/dialogs/${id}/spam`);
      toast.success('Диалог помечен как спам');
      navigate('/dialogs');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="dialog-detail loading">Загрузка...</div>
      </Layout>
    );
  }

  if (!dialog) {
    return (
      <Layout>
        <div className="dialog-detail">Диалог не найден</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dialog-detail">
        <div className="dialog-header card">
          <div className="dialog-info">
            <h2>{dialog.client_name || 'Без имени'}</h2>
            <p className="channel-info">Канал: {dialog.channel_name}</p>
            {dialog.participants && dialog.participants.length > 0 && (
              <p className="participants">
                Участники: {dialog.participants.map(p => p.full_name).join(', ')}
              </p>
            )}
          </div>
          <div className="dialog-actions">
            <button onClick={handleCloseDialog} className="btn btn-secondary">
              Закрыть
            </button>
            <button onClick={handleMarkSpam} className="btn btn-danger">
              Спам
            </button>
          </div>
        </div>

        <div className="messages-container card">
          <div className="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender_type === 'operator' ? 'operator' : 'client'}`}
              >
                <div className="message-header">
                  <span className="message-sender">
                    {message.sender_type === 'operator'
                      ? message.operator_name || 'Оператор'
                      : dialog.client_name || 'Клиент'}
                  </span>
                  <span className="message-time">
                    {new Date(message.created_at).toLocaleString('ru-RU')}
                  </span>
                  {message.edited && (
                    <span className="edited-badge">(изменено)</span>
                  )}
                </div>
                <div className="message-content">
                  {message.content_type === 'file' && message.file_url ? (
                    <a
                      href={`http://localhost:5000${message.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📎 Файл
                    </a>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSendMessage} className="message-input card">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение..."
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            Отправить
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default DialogDetail;
