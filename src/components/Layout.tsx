import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DownloadDesktopLink from './DownloadDesktopLink';
import { notificationsAPI } from '../services/api';
import { NotificationItem } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    if (path.startsWith('/projects')) return 'Projects';
    if (path.startsWith('/todos')) return 'All Tasks';
    if (path.startsWith('/calendar')) return 'Calendar';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/estimates')) return 'Estimates';
    if (path.startsWith('/invoices')) return 'Invoices';
    if (path.startsWith('/service-calls')) return 'Service Calls';
    if (path.startsWith('/materials')) return 'Materials';
    if (path.startsWith('/services')) return 'Services';
    if (path.startsWith('/users')) return 'Users';
    if (path.startsWith('/company')) return 'Company';
    return 'Project Tracker';
  };

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      setNotificationError(null);
      const response = await notificationsAPI.getNotifications(10, 0, true);
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error: any) {
      setNotificationError(error.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id);
      }

      if (notification.service_call_id) {
        navigate(`/service-calls/${notification.service_call_id}`);
      }
      setShowNotifications(false);
    } catch (error) {
      console.error('Failed to navigate from notification:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header for mobile */}
        <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getPageTitle()}
            </h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  if (!showNotifications) {
                    loadNotifications();
                  }
                }}
                className="relative p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                aria-label="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-600 text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <DownloadDesktopLink variant="link" />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="lg:hidden mb-4">
                <NotificationsDropdown
                  notifications={notifications}
                  unreadCount={unreadCount}
                  loading={loadingNotifications}
                  error={notificationError}
                  onRefresh={loadNotifications}
                  onMarkAllRead={async () => {
                    try {
                      await notificationsAPI.markAllAsRead();
                      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
                      setUnreadCount(0);
                    } catch (error) {
                      console.error('Failed to mark all notifications as read:', error);
                    }
                  }}
                  onNotificationClick={handleNotificationClick}
                />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

interface NotificationsDropdownProps {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onMarkAllRead: () => Promise<void> | void;
  onNotificationClick: (notification: NotificationItem) => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  unreadCount,
  loading,
  error,
  onRefresh,
  onMarkAllRead,
  onNotificationClick
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full lg:w-80">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 1119 5" />
            </svg>
          </button>
          <button
            onClick={onMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading notifications...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-500 dark:text-red-400">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No notifications right now.</div>
        ) : (
          notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => onNotificationClick(notification)}
              className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${notification.is_read ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/20'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {notification.message || 'You have a notification'}
                  </p>
                  {notification.service_call_title && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {notification.service_call_title}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <span className="w-2 h-2 mt-1 rounded-full bg-blue-500"></span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Layout; 