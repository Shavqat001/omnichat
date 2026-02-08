import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

interface Operator {
  id: number;
  login: string;
  fullName: string;
  role: string;
  status: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  operator: Operator | null;
  token: string | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  updateStatus: (status: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [operator, setOperator] = useState<Operator | null>(null);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchOperator();
      // Инициализируем WebSocket соединение
      initSocket(token);
    } else {
      // Отключаем WebSocket при выходе
      disconnectSocket();
    }
  }, [token]);

  const fetchOperator = async () => {
    try {
      const response = await api.get('/auth/me');
      setOperator(response.data);
    } catch (error) {
      console.error('Failed to fetch operator:', error);
      logout();
    }
  };

  const login = async (login: string, password: string) => {
    const response = await api.post('/auth/login', { login, password });
    const { token: newToken, operator: newOperator } = response.data;
    setToken(newToken);
    setOperator(newOperator);
    localStorage.setItem('token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    disconnectSocket();
    setToken(null);
    setOperator(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  const updateStatus = async (status: string) => {
    await api.put('/auth/status', { status });
    if (operator) {
      setOperator({ ...operator, status });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        operator,
        token,
        login,
        logout,
        updateStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
