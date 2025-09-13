import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Info } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const firstLoad = useRef(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('https://api.rolexcoderz.live/?get=notifications');
        const data = await response.json();
        if (data && data.status && Array.isArray(data.data)) {
          const processedData = data.data.map(n => ({...n, id: `${n.title}-${n.message}`})).reverse();
          setNotifications(processedData);

          const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
          const newUnreadCount = processedData.filter(n => !readNotifications.includes(n.id)).length;
          setUnreadCount(newUnreadCount);

          if (firstLoad.current && newUnreadCount > 0) {
            setIsModalOpen(true);
            firstLoad.current = false;
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    const allNotificationIds = notifications.map(n => n.id);
    localStorage.setItem('readNotifications', JSON.stringify(allNotificationIds));
    setUnreadCount(0);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const modalComponent = (
    <div className="notification-modal-overlay" onClick={handleCloseModal}>
      <div className="notification-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="notification-modal-header">
          <h2>Notifications</h2>
          <button onClick={handleCloseModal} className="close-btn">
            <X size={24} />
          </button>
        </div>
        <div className="notification-modal-body">
          {isLoading ? (
            <div className="no-notifications">Loading...</div>
          ) : notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div key={notification.id || index} className="notification-item">
                <div className="notification-item-header">
                  <h3 className="notification-title">{notification.title}</h3>
                </div>
                <p className="notification-message">{notification.message}</p>
              </div>
            ))
          ) : (
            <div className="no-notifications">
              <Info size={40} />
              <p>No new notifications at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={handleOpenModal} className="notification-bell">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isModalOpen && createPortal(modalComponent, document.body)}
    </>
  );
};

export default Notifications;
