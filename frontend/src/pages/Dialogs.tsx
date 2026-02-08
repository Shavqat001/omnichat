import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import Layout from '../components/Layout';
import './Dialogs.css';

interface Dialog {
  id: number;
  channel_name: string;
  channel_type: string;
  client_name: string;
  status: string;
  rating: number;
  created_at: string;
  message_count: number;
  operator_name: string;
}

const Dialogs: React.FC = () => {
  const navigate = useNavigate();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    view: 'all',
    status: '',
    channelId: '',
    rating: ''
  });

  useEffect(() => {
    fetchDialogs();
    const socket = getSocket();
    if (socket) {
      // Подписываемся на все события, которые влияют на список диалогов
      socket.on('dialog:new', () => {
        fetchDialogs();
        // Можно добавить звуковое уведомление или toast
      });
      socket.on('dialog:assigned', fetchDialogs);
      socket.on('dialog:transferred', fetchDialogs);
      socket.on('dialog:closed', fetchDialogs);
      socket.on('dialog:invited', fetchDialogs);
    }
    return () => {
      if (socket) {
        socket.off('dialog:new');
        socket.off('dialog:assigned');
        socket.off('dialog:transferred');
        socket.off('dialog:closed');
        socket.off('dialog:invited');
      }
    };
  }, [filters]);

  const fetchDialogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.view) params.append('view', filters.view);
      if (filters.status) params.append('status', filters.status);
      if (filters.channelId) params.append('channelId', filters.channelId);
      if (filters.rating) params.append('rating', filters.rating);

      const response = await api.get(`/dialogs?${params.toString()}`);
      setDialogs(response.data);
    } catch (error) {
      console.error('Failed to fetch dialogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      new: 'new',
      in_progress: 'progress',
      closed: 'closed',
      spam: 'spam'
    };
    return badges[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      new: 'Новый',
      in_progress: 'В работе',
      closed: 'Закрыт',
      spam: 'Спам'
    };
    return labels[status] || status;
  };

  return (
    <Layout>
      <div className="dialogs-page">
        <div className="dialogs-header">
          <h1>Диалоги</h1>
        </div>

        <div className="dialogs-filters card">
          <div className="filter-group">
            <label>Вид:</label>
            <select
              value={filters.view}
              onChange={(e) => setFilters({ ...filters, view: e.target.value })}
              className="select"
            >
              <option value="all">Все</option>
              <option value="incoming">Входящие</option>
              <option value="my">Мои</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Статус:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="select"
            >
              <option value="">Все</option>
              <option value="new">Новый</option>
              <option value="in_progress">В работе</option>
              <option value="closed">Закрыт</option>
              <option value="spam">Спам</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Рейтинг:</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
              className="select"
            >
              <option value="">Все</option>
              <option value="5">5 звезд</option>
              <option value="4">4 звезды</option>
              <option value="3">3 звезды</option>
              <option value="2">2 звезды</option>
              <option value="1">1 звезда</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : (
          <div className="dialogs-list">
            {dialogs.length === 0 ? (
              <div className="empty-state">Нет диалогов</div>
            ) : (
              dialogs.map((dialog) => (
                <div
                  key={dialog.id}
                  className="dialog-card"
                  onClick={() => navigate(`/dialogs/${dialog.id}`)}
                >
                  <div className="dialog-header">
                    <span className={`status-badge ${getStatusBadge(dialog.status)}`}>
                      {getStatusLabel(dialog.status)}
                    </span>
                    <span className="channel-badge">{dialog.channel_name}</span>
                    {dialog.rating && (
                      <span className="rating-badge">⭐ {dialog.rating}</span>
                    )}
                  </div>
                  <div className="dialog-body">
                    <h3>{dialog.client_name || 'Без имени'}</h3>
                    <p className="dialog-meta">
                      {dialog.operator_name && `Оператор: ${dialog.operator_name}`}
                      {' • '}
                      Сообщений: {dialog.message_count}
                    </p>
                    <p className="dialog-date">
                      {new Date(dialog.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dialogs;
