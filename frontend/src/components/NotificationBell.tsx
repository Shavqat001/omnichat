import React, { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './NotificationBell.css';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      // Слушаем новые диалоги
      socket.on('dialog:new', (data: { dialogId: number }) => {
        setUnreadCount((prev) => prev + 1);
        // Показываем уведомление с возможностью клика
        toast.success(
          (t) => (
            <div 
              onClick={() => {
                toast.dismiss(t.id);
                navigate(`/dialogs/${data.dialogId}`);
              }}
              style={{ cursor: 'pointer' }}
            >
              Новый диалог! Нажмите, чтобы открыть.
            </div>
          ),
          {
            duration: 5000
          }
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('dialog:new');
      }
    };
  }, [navigate]);

  const handleClick = () => {
    setUnreadCount(0);
    navigate('/dialogs?view=incoming');
  };

  return (
    <div className="notification-bell" onClick={handleClick}>
      <span className="bell-icon">🔔</span>
      {unreadCount > 0 && (
        <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
      )}
    </div>
  );
};

export default NotificationBell;
