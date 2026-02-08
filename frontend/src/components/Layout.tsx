import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { disconnectSocket } from '../services/socket';
import NotificationBell from './NotificationBell';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { operator, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    disconnectSocket();
    logout();
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>OmniChat</h2>
          <div className="operator-info">
            <p className="operator-name">{operator?.fullName}</p>
            <p className="operator-role">{operator?.role === 'admin' ? 'Администратор' : 'Оператор'}</p>
          </div>
          <NotificationBell />
        </div>
        <ul className="sidebar-menu">
          <li>
            <Link
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Главная
            </Link>
          </li>
          <li>
            <Link
              to="/dialogs"
              className={location.pathname.startsWith('/dialogs') ? 'active' : ''}
            >
              Диалоги
            </Link>
          </li>
          <li>
            <Link
              to="/statistics"
              className={location.pathname === '/statistics' ? 'active' : ''}
            >
              Статистика
            </Link>
          </li>
          {operator?.role === 'admin' && (
            <li>
              <Link
                to="/admin"
                className={location.pathname === '/admin' ? 'active' : ''}
              >
                Администрирование
              </Link>
            </li>
          )}
        </ul>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn btn-secondary">
            Выйти
          </button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
