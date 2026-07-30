import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Plus, PieChart, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNav({ onOpenMenu }) {
  const { profile } = useAuth();
  
  if (!profile) return null;

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-content">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} strokeWidth={1.5} />
          <span>Home</span>
        </NavLink>
        
        <NavLink to="/guests" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Users size={22} strokeWidth={1.5} />
          <span>Guests</span>
        </NavLink>
        
        <div className="bottom-nav-fab-container">
          <NavLink to="/add-guest" className={({ isActive }) => `bottom-nav-fab ${isActive ? 'active' : ''}`}>
            <Plus size={28} strokeWidth={2.5} color="white" />
          </NavLink>
          <span className="bottom-nav-fab-label">Add</span>
        </div>
        
        <NavLink to="/reports" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={22} strokeWidth={1.5} />
          <span>Reports</span>
        </NavLink>
        
        <button className="bottom-nav-item" onClick={onOpenMenu} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <Settings size={22} strokeWidth={1.5} />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}
