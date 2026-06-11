import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, Clock, Info, Trash2, AlertTriangle } from 'lucide-react';
import { getNotifications, markNotificationsRead, deleteNotification, subscribeToNotifications } from '../lib/supabaseDB';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();

    const sub = subscribeToNotifications(profile.id, () => {
      fetchNotifications();
    });

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [profile]);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch (e) {
      toast.error('Failed to mark as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (e) {
      toast.error('Failed to delete notification');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'urgent': return <AlertTriangle size={20} className="text-danger" />;
      case 'reminder': return <Bell size={20} className="text-primary" />;
      case 'info': return <Info size={20} className="text-secondary" />;
      default: return <Bell size={20} className="text-muted" />;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case 'urgent': return 'var(--danger-light)';
      case 'reminder': return 'rgba(99, 102, 241, 0.1)';
      case 'info': return 'rgba(100, 116, 139, 0.1)';
      default: return 'var(--surface-2)';
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Your alerts and reminders history</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
            <CheckCircle size={16} /> Mark all read
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} style={{ opacity: 0.3 }} />
              <h3>All caught up!</h3>
              <p>You have no notifications at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map((n, i) => (
                <div key={n.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  padding: '16px 24px',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                  transition: 'background 0.2s ease'
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: getBg(n.type), display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text)'
                  }}>
                    {getIcon(n.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>

                  <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', flexShrink: 0 }}
                    onClick={() => handleDelete(n.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
