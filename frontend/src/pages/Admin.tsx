import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import Layout from '../components/Layout';
import toast from 'react-hot-toast';
import './Admin.css';

interface Operator {
  id: number;
  login: string;
  full_name: string;
  phone_number: string;
  email: string;
  role: string;
  status: string;
}

const Admin: React.FC = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    role: 'operator',
    teamId: ''
  });

  useEffect(() => {
    fetchOperators();
    fetchTeams();
  }, []);

  const fetchOperators = async () => {
    try {
      const response = await api.get('/operators');
      setOperators(response.data);
    } catch (error) {
      console.error('Failed to fetch operators:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get('/admin/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/operators', formData);
      toast.success('Оператор создан');
      setShowCreateForm(false);
      setFormData({
        login: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        email: '',
        role: 'operator',
        teamId: ''
      });
      fetchOperators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка создания оператора');
    }
  };

  const handleDeleteOperator = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого оператора?')) {
      return;
    }
    try {
      await api.delete(`/admin/operators/${id}`);
      toast.success('Оператор удален');
      fetchOperators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ошибка удаления оператора');
    }
  };

  return (
    <Layout>
      <div className="admin-page">
        <div className="admin-header">
          <h1>Администрирование</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            {showCreateForm ? 'Отмена' : 'Создать оператора'}
          </button>
        </div>

        {showCreateForm && (
          <div className="card create-form">
            <h2>Создать оператора</h2>
            <form onSubmit={handleCreateOperator}>
              <div className="form-row">
                <div className="form-group">
                  <label>Логин *</label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    required
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Пароль *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ФИО *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Телефон</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Роль</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="select"
                  >
                    <option value="operator">Оператор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Создать
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <h2>Операторы</h2>
          <table className="operators-table">
            <thead>
              <tr>
                <th>Логин</th>
                <th>ФИО</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((operator) => (
                <tr key={operator.id}>
                  <td>{operator.login}</td>
                  <td>{operator.full_name}</td>
                  <td>{operator.phone_number || '-'}</td>
                  <td>{operator.email || '-'}</td>
                  <td>{operator.role === 'admin' ? 'Администратор' : 'Оператор'}</td>
                  <td>
                    <span className={`status-badge ${operator.status}`}>
                      {operator.status === 'online' ? 'В сети' : 
                       operator.status === 'break' ? 'Перерыв' : 'Не в сети'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteOperator(operator.id)}
                      className="btn btn-danger btn-sm"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
