import React, { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { getUsers, createUser, updateUser, deleteUser } from '../lib/supabaseDB';

const EMPTY = { name: '', email: '', password: '', role: 'sub_admin' };

const UserManagement = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editForm, setEditForm] = useState({ name: '', role: 'sub_admin' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('All fields are required'); return; }
    setSaving(true);
    try {
      await createUser(form);
      toast.success(`Account for "${form.name}" created. They may need to verify their email before signing in.`);
      setAddModal(false); setForm(EMPTY); load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await updateUser(selected.id, editForm);
      toast.success('User updated successfully');
      setEditModal(false); load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteUser(selected.id);
      toast.success('User deleted');
      setDeleteModal(false); load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      toast.success(`${u.name} has been ${u.is_active ? 'disabled' : 'enabled'}`);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const openEdit = (u) => { setSelected(u); setEditForm({ name: u.name, role: u.role }); setEditModal(true); };
  const openDelete = (u) => { setSelected(u); setDeleteModal(true); };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage Sub Admin accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={16} /> Add Sub Admin
        </button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loadingUsers ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner"></div></div>
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}><p>No users found.</p></div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong>{u.id === profile?.id && <span className="badge badge-primary" style={{ marginLeft: 8 }}>You</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'super_admin' ? 'badge-primary' : 'badge-info'}`}>
                        {u.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {u.id !== profile?.id && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(u)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-icon" title={u.is_active ? 'Disable' : 'Enable'} onClick={() => toggleActive(u)}>
                            {u.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                          <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => openDelete(u)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setForm(EMPTY); }} title="Add New Sub Admin"
        confirmText={saving ? 'Creating…' : 'Create Account'} onConfirm={handleAdd}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[['name', 'Full Name', 'text', 'John Doe'], ['email', 'Email Address', 'email', 'john@example.com'], ['password', 'Password', 'password', 'Minimum 6 characters']].map(([k, lbl, type, ph]) => (
            <div className="form-group" key={k} style={{ margin: 0 }}>
              <label className="form-label">{lbl}</label>
              <input type={type} className="form-input no-icon" placeholder={ph} value={form[k]} onChange={set(k)} />
            </div>
          ))}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Role</label>
            <select className="form-input no-icon" value={form.role} onChange={set('role')}>
              <option value="sub_admin">Sub Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            ℹ️ The new user may need to verify their email before signing in. Disable email confirmation in Supabase Auth settings to skip this.
          </p>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit User"
        confirmText={saving ? 'Saving…' : 'Save Changes'} onConfirm={handleEdit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input no-icon" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Role</label>
            <select className="form-input no-icon" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="sub_admin">Sub Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete User"
        confirmText={saving ? 'Deleting…' : 'Delete'} confirmVariant="danger" onConfirm={handleDelete}>
        <p>Are you sure you want to permanently delete <strong>{selected?.name}</strong>? All their guest entries will remain but will be unassigned.</p>
      </Modal>
    </div>
  );
};

export default UserManagement;
