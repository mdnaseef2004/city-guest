import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Plus, CheckCircle, Clock, AlertCircle, Trash2, User, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  createAssignment, getAssignments, updateAssignmentStatus,
  deleteAssignment, getUsers, sendUrgentReminder
} from '../lib/supabaseDB';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: Clock,         color: 'var(--warning)',  bg: 'var(--warning-light)' },
  in_progress: { label: 'In Progress', icon: AlertCircle,   color: 'var(--info)',     bg: 'var(--info-light)' },
  completed:   { label: 'Completed',   icon: CheckCircle,   color: 'var(--success)',  bg: 'var(--success-light)' },
};

export default function Assignments() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const [assignments, setAssignments] = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [newModal, setNewModal]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState({ guest_name: '', notes: '', assigned_to: '', due_date: '', is_urgent: false });

  const loadRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssignments();
      setAssignments(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep ref always pointing to latest load
  useEffect(() => { loadRef.current = load; }, [load]);

  // Initial fetch
  useEffect(() => { load(); }, [load]);

  // Real-time sync — created ONCE, uses ref to stay current
  useEffect(() => {
    const channelName = `assignments_page_${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_assignments' }, () => {
        loadRef.current?.();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isSuperAdmin) getUsers().then(u => setUsers(u.filter(x => x.role === 'sub_admin')));
  }, [isSuperAdmin]);

  const handleCreate = async () => {
    if (!form.guest_name.trim()) return toast.error('Guest name is required');
    if (!form.assigned_to) return toast.error('Please select a sub admin');
    setSaving(true);
    try {
      await createAssignment(form);
      toast.success('Assignment created! Sub admin will be notified.');
      setNewModal(false);
      setForm({ guest_name: '', notes: '', assigned_to: '', due_date: '', is_urgent: false });
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await updateAssignmentStatus(id, status);
      toast.success(`Marked as ${STATUS_CONFIG[status].label}`);
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await deleteAssignment(id);
      toast.success('Assignment deleted');
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const pending     = assignments.filter(a => a.status === 'pending').length;
  const inProgress  = assignments.filter(a => a.status === 'in_progress').length;
  const completed   = assignments.filter(a => a.status === 'completed').length;

  return (
    <div className="page">
      <div className="page-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">
            {isSuperAdmin ? 'Assign guests to sub admins' : 'Your assigned guests'}
          </p>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => setNewModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> New Assignment
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Pending',     value: pending,    color: 'var(--warning)', bg: 'var(--warning-light)' },
          { label: 'In Progress', value: inProgress, color: 'var(--info)',    bg: 'var(--info-light)' },
          { label: 'Completed',   value: completed,  color: 'var(--success)', bg: 'var(--success-light)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <Bell size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Assignment List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">All Assignments</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} style={{ opacity: 0.3 }} />
              <h3>No Assignments Yet</h3>
              <p>{isSuperAdmin ? 'Create your first assignment above.' : 'No guests assigned to you yet.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {assignments.map((a, i) => {
                const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 16,
                    padding: '18px 24px',
                    borderBottom: i < assignments.length - 1 ? '1px solid var(--border)' : 'none',
                    background: a.status === 'pending' ? 'rgba(245,158,11,0.04)' : 'transparent',
                    flexWrap: 'wrap',
                  }}>
                    {/* Status icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: cfg.bg, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: cfg.color
                    }}>
                      <StatusIcon size={18} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {a.guest_name}
                        {a.is_urgent && (
                          <span style={{
                            background: 'var(--danger-light)', color: 'var(--danger)',
                            padding: '2px 8px', borderRadius: 999, fontSize: 11,
                            display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700
                          }}>
                            <AlertTriangle size={12} /> URGENT
                          </span>
                        )}
                      </div>
                      {a.notes && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                          {a.notes}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        {isSuperAdmin && a.profiles_assigned_to && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={11} /> {a.profiles_assigned_to?.name || '—'}
                          </span>
                        )}
                        {a.due_date && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
                            <Calendar size={11} /> Due: {new Date(a.due_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </span>
                        )}
                        <span>
                          {new Date(a.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <span style={{
                          padding: '2px 10px', borderRadius: 999,
                          background: cfg.bg, color: cfg.color, fontWeight: 600,
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                      {!isSuperAdmin && a.status === 'pending' && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => handleStatus(a.id, 'in_progress')}>
                          Start
                        </button>
                      )}
                      {!isSuperAdmin && a.status === 'in_progress' && (
                        <button className="btn btn-primary btn-sm"
                          onClick={() => handleStatus(a.id, 'completed')}>
                          <CheckCircle size={13} /> Complete
                        </button>
                      )}
                      {isSuperAdmin && a.status !== 'completed' && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={async () => {
                            try {
                              await sendUrgentReminder(a.assigned_to, a.guest_name);
                              toast.success('Reminder sent to sub admin!');
                            } catch (e) {
                              toast.error('Failed to send reminder');
                            }
                          }}>
                          <Bell size={13} /> Remind
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button className="btn btn-ghost btn-icon"
                          onClick={() => handleDelete(a.id)}
                          style={{ color: 'var(--danger)' }} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Assignment Modal */}
      <Modal
        isOpen={newModal}
        onClose={() => setNewModal(false)}
        title="New Guest Assignment"
        confirmText={saving ? 'Sending...' : 'Assign Guest'}
        onConfirm={handleCreate}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Guest Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input
              type="text" className="form-input no-icon"
              placeholder="Enter guest name"
              value={form.guest_name}
              onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Instructions</label>
            <textarea
              className="form-input no-icon" rows={3}
              placeholder="Add any notes for the sub admin..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date (Optional)</label>
            <input
              type="date" className="form-input no-icon"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assign To <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select
              className="form-input no-icon"
              value={form.assigned_to}
              onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
            >
              <option value="">Select a Sub Admin...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, padding: '12px', background: 'var(--danger-light)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <input
              type="checkbox"
              id="urgent"
              checked={form.is_urgent}
              onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--danger)' }}
            />
            <label htmlFor="urgent" style={{ color: 'var(--danger)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0, flex: 1 }}>
              <AlertTriangle size={16} /> Mark as Urgent (Triggers Loud Alarm for Sub Admin)
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
