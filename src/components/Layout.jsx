import React, { useState, useEffect, createContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Moon, Sun, Menu, Camera, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import { updateUser, uploadAvatar, subscribeToAssignments } from '../lib/supabaseDB';
import toast from 'react-hot-toast';

// Context to share pending badge count with Sidebar
export const AssignmentContext = createContext({ pendingCount: 0 });

// Play alert sound using Web Audio API
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    playBeep(880, 0, 0.15);
    playBeep(1100, 0.18, 0.15);
    playBeep(880, 0.36, 0.25);
  } catch (e) {
    console.warn('Audio not available:', e);
  }
}

export default function Layout() {
  const { profile, refreshProfile } = useAuth();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [profileModal, setProfileModal]   = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm]     = useState({ name: '', date_of_birth: '', phone_number: '' });
  const [avatarFile, setAvatarFile]       = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [pendingCount, setPendingCount]   = useState(0);
  const [notifFlash, setNotifFlash]       = useState(false);

  // Real-time assignment notifications for sub admins
  useEffect(() => {
    if (!profile?.id || profile?.role !== 'sub_admin') return;

    const channel = subscribeToAssignments(profile.id, (newAssignment) => {
      playAlertSound();
      setNotifFlash(true);
      setTimeout(() => setNotifFlash(false), 3000);
      setPendingCount(c => c + 1);

      toast.custom((t) => (
        <div
          onClick={() => toast.dismiss(t.id)}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: 'var(--surface)', border: '2px solid var(--primary)',
            borderRadius: 14, padding: '14px 18px',
            boxShadow: '0 8px 30px rgba(5,150,105,0.25)',
            maxWidth: 340, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'var(--primary-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
          }}>
            <Bell size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 3 }}>
              🔔 New Guest Assigned!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{newAssignment.guest_name}</strong> has been assigned to you.
            </div>
            <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>Tap to dismiss</div>
          </div>
        </div>
      ), { duration: 8000 });
    });

    return () => { channel.unsubscribe(); };
  }, [profile?.id, profile?.role]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const openProfile = () => {
    setProfileForm({
      name: profile?.name || '',
      date_of_birth: profile?.date_of_birth || '',
      phone_number: profile?.phone_number || ''
    });
    setAvatarPreview(profile?.profile_picture || '');
    setAvatarFile(null);
    setProfileModal(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      let pictureUrl = profile?.profile_picture;
      if (avatarFile) {
        pictureUrl = await uploadAvatar(profile.id, avatarFile);
      }
      await updateUser(profile.id, {
        name: profileForm.name,
        date_of_birth: profileForm.date_of_birth || null,
        phone_number: profileForm.phone_number || null,
        profile_picture: pictureUrl || null
      });
      await refreshProfile();
      toast.success('Profile updated successfully!');
      setProfileModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AssignmentContext.Provider value={{ pendingCount, setPendingCount }}>
      <div className="app-shell">
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} pendingCount={pendingCount} />

        <div className="main-content">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setSidebarOpen(true)}
                style={{ display: 'none' }}
                id="menu-btn"
              >
                <Menu size={20} />
              </button>
              <style>{`@media(max-width:768px){#menu-btn{display:flex!important}}`}</style>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Bell badge for sub admins */}
              {profile?.role === 'sub_admin' && pendingCount > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: notifFlash ? 'var(--primary)' : 'var(--text-muted)' }}
                    title="Pending assignments"
                    onClick={() => { window.location.href = '/assignments'; }}
                  >
                    <Bell size={20} style={{ animation: notifFlash ? 'bellRing 0.5s ease 3' : 'none' }} />
                    <span style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--danger)', color: 'white',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  </button>
                </div>
              )}

              <button className="btn btn-ghost btn-icon" onClick={toggleDark} title="Toggle dark mode">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div
                onClick={openProfile}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px 6px 8px',
                  background: 'var(--surface-2)', borderRadius: 10,
                  border: '1.5px solid var(--border)', cursor: 'pointer'
                }}
                title="Edit Profile"
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 13, overflow: 'hidden'
                }}>
                  {profile?.profile_picture ? (
                    <img src={profile.profile_picture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    profile?.name?.[0]?.toUpperCase() || 'U'
                  )}
                </div>
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.name || 'User'}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {profile?.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="page-content">
            <Outlet />
          </main>
        </div>

        <Modal
          isOpen={profileModal}
          onClose={() => setProfileModal(false)}
          title="My Profile"
          confirmText={savingProfile ? 'Saving...' : 'Save Profile'}
          onConfirm={saveProfile}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--border)' }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{profile?.name?.[0]?.toUpperCase() || 'U'}</span>
              )}
              <label style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', textAlign: 'center', cursor: 'pointer', padding: '4px 0' }}>
                <Camera size={14} style={{ margin: '0 auto' }} />
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="form-group" style={{ width: '100%', margin: 0 }}>
              <label className="form-label">Name</label>
              <input type="text" className="form-input no-icon" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group" style={{ width: '100%', margin: 0 }}>
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-input no-icon" value={profileForm.date_of_birth} onChange={e => setProfileForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            </div>
            <div className="form-group" style={{ width: '100%', margin: 0 }}>
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input no-icon" value={profileForm.phone_number} onChange={e => setProfileForm(f => ({ ...f, phone_number: e.target.value }))} />
            </div>
          </div>
        </Modal>

        <style>{`
          @keyframes bellRing {
            0%,100% { transform: rotate(0); }
            20% { transform: rotate(-20deg); }
            40% { transform: rotate(20deg); }
            60% { transform: rotate(-10deg); }
            80% { transform: rotate(10deg); }
          }
        `}</style>
      </div>
    </AssignmentContext.Provider>
  );
}
