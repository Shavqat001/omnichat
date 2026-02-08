import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import Layout from '../components/Layout';
import './Dashboard.css';

interface DashboardStats {
  totalDialogs: number;
  newDialogs: number;
  inProgressDialogs: number;
  closedDialogs: number;
  avgRating: number;
}

const Dashboard: React.FC = () => {
  const { operator, updateStatus } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalDialogs: 0,
    newDialogs: 0,
    inProgressDialogs: 0,
    closedDialogs: 0,
    avgRating: 0
  });
  const [status, setStatus] = useState(operator?.status || 'offline');

  useEffect(() => {
    fetchStats();
    const socket = getSocket();
    if (socket) {
      socket.on('dialog:new', () => {
        fetchStats();
      });
    }
    return () => {
      if (socket) {
        socket.off('dialog:new');
      }
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/statistics');
      if (response.data.length > 0) {
        const latest = response.data[0];
        setStats({
          totalDialogs: latest.total_dialogs || 0,
          newDialogs: latest.new_dialogs || 0,
          inProgressDialogs: latest.in_progress_dialogs || 0,
          closedDialogs: latest.closed_dialogs || 0,
          avgRating: latest.avg_rating || 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus(newStatus);
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Панель управления</h1>
          <div className="status-selector">
            <span>Статус: </span>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="select"
            >
              <option value="online">В сети</option>
              <option value="break">Перерыв</option>
              <option value="offline">Не в сети</option>
            </select>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Всего диалогов</h3>
            <p className="stat-value">{stats.totalDialogs}</p>
          </div>
          <div className="stat-card new">
            <h3>Новые</h3>
            <p className="stat-value">{stats.newDialogs}</p>
          </div>
          <div className="stat-card progress">
            <h3>В работе</h3>
            <p className="stat-value">{stats.inProgressDialogs}</p>
          </div>
          <div className="stat-card closed">
            <h3>Закрытые</h3>
            <p className="stat-value">{stats.closedDialogs}</p>
          </div>
          <div className="stat-card rating">
            <h3>Средний рейтинг</h3>
            <p className="stat-value">{stats.avgRating.toFixed(1)}</p>
          </div>
        </div>

        <div className="quick-actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/dialogs')}
          >
            Все диалоги
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/statistics')}
          >
            Статистика
          </button>
          {operator?.role === 'admin' && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/admin')}
            >
              Администрирование
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
