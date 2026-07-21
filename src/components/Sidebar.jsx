import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserRoundPlus,
  BookOpenText,
  CalendarPlus2,
  BellDot,
  ChartNoAxesCombined,
  CalendarRange,
  UsersRound,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/',              icon: LayoutDashboard,     label: 'Dashboard',        roles: ['super_admin', 'sub_admin'] },
  { to: '/add-guest',     icon: UserRoundPlus,       label: 'Add Guest Visit',  roles: ['super_admin', 'sub_admin'] },
  { to: '/guests',        icon: BookOpenText,        label: 'Guest Records',    roles: ['super_admin', 'sub_admin'] },
  { to: '/add-event',     icon: CalendarPlus2,       label: 'Add Event',        roles: ['super_admin', 'sub_admin'] },
  { to: '/assignments',   icon: BellDot,             label: 'Assignments',      roles: ['super_admin', 'sub_admin'] },
  { to: '/reports',       icon: ChartNoAxesCombined, label: 'Reports',          roles: ['super_admin'] },
  { to: '/event-reports', icon: CalendarRange,       label: 'Event Reports',    roles: ['super_admin', 'sub_admin'] },
  { to: '/users',         icon: UsersRound,          label: 'User Management',  roles: ['super_admin'] },
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
      <div className="sidebar-logo" style={{
        flexDirection: 'column', height: 'auto',
        padding: '24px 16px 18px', textAlign: 'center', gap: '10px',
      }}>
        <img
          src="/IMG_2458.PNG"
          alt="City Guest"
          style={{
            width: '100%', maxWidth: '88px', height: 'auto', maxHeight: '58px',
            objectFit: 'contain', background: '#fff', padding: '6px',
            borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            margin: '0 auto',
          }}
        />
        <div>
          <div className="sidebar-logo-text" style={{
            fontFamily: "'Poppins', sans-serif", fontWeight: 700,
            fontSize: '18px', marginTop: '6px', letterSpacing: '-0.01em',
          }}>
            City Guest
          </div>
          <div className="sidebar-logo-sub" style={{ lineHeight: 1.3, marginTop: 2 }}>
            Guest Relations
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          style={{ marginLeft: 'auto', display: 'none' }}
          id="sidebar-close"
        >
          <X size={18} strokeWidth={2.5} />
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
            <Icon size={18} strokeWidth={1.8} />
            <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
            {to === '/assignments' && profile?.role === 'sub_admin' && pendingCount > 0 && (
              <span style={{
                background: 'var(--danger)', color: 'white',
                fontSize: 10.5, fontWeight: 700, padding: '2px 7px',
                borderRadius: 999, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', lineHeight: 1.4,
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
          fontSize: 12.5, color: 'var(--text-muted)',
          padding: '10px 14px', marginBottom: 10,
          background: 'var(--surface-2)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5, marginBottom: 2 }}>
            {profile?.name}
          </div>
          <div style={{ fontSize: 11.5 }}>
            {profile?.role === 'super_admin' ? '⚙️ Super Admin' : '👤 Sub Admin'}
          </div>
        </div>
        <button className="btn btn-secondary btn-full" onClick={handleLogout} style={{ gap: 8 }}>
          <LogOut size={15} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
