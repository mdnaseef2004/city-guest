import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, ClipboardList, BarChart3,
  Users, LogOut, X, Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'sub_admin'] },
  { to: '/add-guest', icon: UserPlus, label: 'Add Guest Visit', roles: ['super_admin', 'sub_admin'] },
  { to: '/guests', icon: ClipboardList, label: 'Guest Records', roles: ['super_admin', 'sub_admin'] },
  { to: '/assignments', icon: Bell, label: 'Assignments', roles: ['super_admin', 'sub_admin'] },
  { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['super_admin'] },
  { to: '/users', icon: Users, label: 'User Management', roles: ['super_admin'] },
];

export default function Sidebar({ isOpen, onClose, pendingCount = 0 }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const visible = NAV_ITEMS.filter(n => n.roles.includes(profile?.role));

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ flexDirection: 'column', height: 'auto', padding: '24px 16px 16px', textAlign: 'center', gap: '8px' }}>
        <img src="/IMG_2458.PNG" alt="City Guest" style={{ width: '100%', maxWidth: '90px', height: 'auto', maxHeight: '60px', objectFit: 'contain', background: '#fff', padding: '6px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', margin: '0 auto' }} />
        <div>
          <div className="sidebar-logo-text" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: '700', fontSize: '18px', marginTop: '4px' }}>City Guest</div>
          <div className="sidebar-logo-sub" style={{ lineHeight: '1' }}>Guest Relations</div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          style={{ marginLeft: 'auto', display: 'none' }}
          id="sidebar-close"
        >
          <X size={18} />
        </button>
        <style>{`@media(max-width:768px){#sidebar-close{display:flex!important}}`}</style>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {visible.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={17} />
            <span style={{ flex: 1 }}>{label}</span>
            {to === '/assignments' && profile?.role === 'sub_admin' && pendingCount > 0 && (
              <span style={{
                background: 'var(--danger)', color: 'white',
                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{
          fontSize: 12, color: 'var(--text-muted)',
          padding: '8px 12px', marginBottom: 8,
          background: 'var(--surface-2)', borderRadius: 8,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{profile?.name}</div>
          <div>{profile?.role === 'super_admin' ? '⚙️ Super Admin' : '👤 Sub Admin'}</div>
        </div>
        <button className="btn btn-secondary btn-full" onClick={handleLogout}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
