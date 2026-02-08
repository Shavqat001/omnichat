import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import Layout from '../components/Layout';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Statistics.css';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [channelStats, setChannelStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
    fetchChannelStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/statistics?period=daily');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelStatistics = async () => {
    try {
      const response = await api.get('/statistics/channels');
      setChannelStats(response.data);
    } catch (error) {
      console.error('Failed to fetch channel statistics:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/statistics/export?period=daily', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statistics-${new Date().toISOString()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export statistics:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="statistics-page loading">Загрузка...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="statistics-page">
        <div className="statistics-header">
          <h1>Статистика</h1>
          <button onClick={handleExport} className="btn btn-primary">
            Экспорт в Excel
          </button>
        </div>

        <div className="statistics-content">
          <div className="card">
            <h2>Динамика диалогов</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_dialogs" stroke="#8884d8" name="Всего" />
                <Line type="monotone" dataKey="new_dialogs" stroke="#82ca9d" name="Новые" />
                <Line type="monotone" dataKey="closed_dialogs" stroke="#ffc658" name="Закрытые" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2>Статистика по каналам</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_dialogs" fill="#8884d8" name="Всего диалогов" />
                <Bar dataKey="closed_dialogs" fill="#82ca9d" name="Закрытые" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="stats-table card">
            <h2>Детальная статистика</h2>
            <table>
              <thead>
                <tr>
                  <th>Период</th>
                  <th>Всего</th>
                  <th>Новые</th>
                  <th>В работе</th>
                  <th>Закрытые</th>
                  <th>Средний рейтинг</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, index) => (
                  <tr key={index}>
                    <td>{new Date(stat.period).toLocaleDateString('ru-RU')}</td>
                    <td>{stat.total_dialogs || 0}</td>
                    <td>{stat.new_dialogs || 0}</td>
                    <td>{stat.in_progress_dialogs || 0}</td>
                    <td>{stat.closed_dialogs || 0}</td>
                    <td>{stat.avg_rating ? stat.avg_rating.toFixed(1) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Statistics;
