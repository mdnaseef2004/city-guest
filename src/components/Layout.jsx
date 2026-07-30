import React, { useState, useEffect, createContext, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { MoonStar, SunMedium, AlignJustify, Camera, BellRing, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import { updateUser, uploadAvatar, subscribeToAssignments, subscribeToReminders, savePushSubscription, getNotifications, subscribeToNotifications } from '../lib/supabaseDB';
import toast from 'react-hot-toast';

// Context to share pending badge count with Sidebar
export const AssignmentContext = createContext({ pendingCount: 0 });

// Web Audio API logic for sounds
let audioCtx = null;
let currentOscillators = [];

function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Flag for repeating alarms
let isAlarmActive = false;

function speakAnnouncement(message) {
  if (!('speechSynthesis' in window)) return false;

  // Cancel any stuck speech
  window.speechSynthesis.cancel();

  const speak = () => {
    if (!isAlarmActive) return;

    const utter = new SpeechSynthesisUtterance(message);
    utter.lang = 'en-IN';      // Indian English accent
    utter.rate = 0.9;
    utter.pitch = 1.1;
    utter.volume = 1.0;

    // Loop speech every 3 seconds if alarm is still active
    utter.onend = () => {
      if (isAlarmActive) {
        setTimeout(speak, 3000);
      }
    };

    utter.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      if (isAlarmActive) {
        setTimeout(speak, 4000);
      }
    };

    window.speechSynthesis.speak(utter);
  };

  speak();
  return true;
}

function stopAlarm() {
  isAlarmActive = false;
  // Stop any playing oscillators
  currentOscillators.forEach(osc => {
    try { osc.stop(); } catch (e) { }
  });
  currentOscillators = [];
  // Stop speech
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function playBeep() {
  const ctx = initAudio();
  if (!ctx) return;
  const play = (freq, start, dur) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.5, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  };
  // Two-tone notification chime
  play(1046, 0, 0.18);    // C6
  play(1318, 0.20, 0.25); // E6
}

function startUrgentSiren(customMessage) {
  stopAlarm();
  isAlarmActive = true;

  const message = customMessage || 'Attention! You have a new guest requiring immediate attention. Please respond now.';
  speakAnnouncement(message);
}


export default function Layout() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', date_of_birth: '', phone_number: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFlash, setNotifFlash] = useState(false);

  // Urgent Alarm State
  const [urgentAlarmActive, setUrgentAlarmActive] = useState(false);
  const [urgentGuest, setUrgentGuest] = useState('');

  // Request notification permission AND set up Web Push subscription for background alerts
  useEffect(() => {
    if (!profile?.id) return;

    async function setupPush() {
      // Step 1: ask for permission
      if (!('Notification' in window)) return;
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return;

      // Step 2: register push subscription (works in background)
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const registration = window.__swRegistration ||
          await navigator.serviceWorker.ready;

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        // Convert base64url VAPID key to Uint8Array
        const urlB64 = vapidKey.replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - urlB64.length % 4) % 4);
        const base64 = (urlB64 + padding);
        const raw = window.atob(base64);
        const outputArray = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) outputArray[i] = raw.charCodeAt(i);

        // Subscribe or retrieve existing subscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray,
          });
        }

        // Save to Supabase so the server can send pushes to this device
        await savePushSubscription(subscription);
      } catch (err) {
        console.warn('Push subscription setup failed:', err.message);
      }
    }

    setupPush();

    // Step 3: listen for Service Worker messages (urgent siren on notification tap)
    const onSwSiren = () => {
      initAudio();
      startUrgentSiren();
      setUrgentAlarmActive(true);
    };
    window.addEventListener('sw-urgent-siren', onSwSiren);

    // Step 4: if app was opened via an urgent notification tap, auto-start siren
    if (window.location.search.includes('urgent=1')) {
      initAudio();
      startUrgentSiren();
      setUrgentAlarmActive(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('sw-urgent-siren', onSwSiren);
    };
  }, [profile?.id]);

  // Real-time assignment notifications for sub admins
  useEffect(() => {
    if (!profile?.id || profile?.role !== 'sub_admin') return;

    const channel = subscribeToAssignments(profile.id, (newAssignment) => {
      // Must unlock audio context on first interaction, so we do it gently
      initAudio();

      setPendingCount(c => c + 1);

      if (newAssignment.is_urgent) {
        // Trigger loud continuous alarm
        startUrgentSiren();
        setUrgentGuest(newAssignment.guest_name);
        setUrgentAlarmActive(true);

        // Show System Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 URGENT GUEST ASSIGNMENT', {
            body: `${newAssignment.guest_name} requires immediate attention!`,
            requireInteraction: true,
          });
        }
      } else {
        // Standard beep
        playBeep();
        setNotifFlash(true);
        setTimeout(() => setNotifFlash(false), 3000);

        // Show standard System Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Guest Assigned', {
            body: `${newAssignment.guest_name} has been assigned to you.`,
          });
        }

        // Show Toast
        toast.custom((t) => (
          <div
            onClick={() => { toast.dismiss(t.id); navigate('/assignments'); }}
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
              <BellRing size={20} strokeWidth={1.8} />
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
      }
    });

    const reminderChannel = subscribeToReminders(profile.id, (payload) => {
      initAudio();
      startUrgentSiren(`Please check the details. Super Admin is reminding you about guest ${payload.guest_name}.`);
      setUrgentGuest(payload.guest_name + " (REMINDER)");
      setUrgentAlarmActive(true);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 URGENT REMINDER', {
          body: `Super Admin is reminding you about ${payload.guest_name}!`,
          requireInteraction: true,
        });
      }
    });

    return () => {
      channel.unsubscribe();
      reminderChannel.unsubscribe();
      stopAlarm();
    };
  }, [profile?.id, profile?.role]);

  // Notifications fetching
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnread = () => {
      getNotifications().then(data => {
        setUnreadCount(data.filter(n => !n.is_read).length);
      }).catch(console.warn);
    };

    fetchUnread();
    const notifSub = subscribeToNotifications(profile.id, () => {
      fetchUnread();
    });

    return () => {
      if (notifSub) notifSub.unsubscribe();
    };
  }, [profile?.id]);

  const acknowledgeAlarm = () => {
    stopAlarm();
    setUrgentAlarmActive(false);
    navigate('/assignments');
  };

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
                <AlignJustify size={20} strokeWidth={1.8} />
              </button>
              <style>{`@media(max-width:768px){#menu-btn{display:flex!important}}`}</style>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Notification Bell (Always visible) */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-ghost btn-icon"
                  style={{ color: notifFlash ? 'var(--primary)' : 'var(--text-muted)' }}
                  title="Notifications"
                  onClick={() => navigate('/notifications')}
                >
                  <BellRing size={18} strokeWidth={1.8} style={{ animation: notifFlash ? 'bellRing 0.5s ease 3' : 'none' }} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--danger)', color: 'white',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <button className="btn btn-ghost btn-icon" onClick={toggleDark} title="Toggle dark mode">
                {dark ? <SunMedium size={19} strokeWidth={1.8} /> : <MoonStar size={18} strokeWidth={1.8} />}
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
                  <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{profile?.name || 'User'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>
                    {profile?.role === 'super_admin' ? '⚙️ Super Admin' : '👤 Sub Admin'}
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

        {/* URGENT ALARM OVERLAY */}
        {urgentAlarmActive && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(239, 68, 68, 0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', animation: 'flashBackground 1s infinite alternate'
          }}>
            <div style={{
              background: 'white', padding: 40, borderRadius: 24, textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxWidth: 400, width: '90%',
              animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <ShieldAlert size={64} color="#ef4444" style={{ margin: '0 auto 16px', animation: 'wobble 1s infinite' }} strokeWidth={1.5} />
              <h2 style={{ fontFamily: 'var(--font-heading)', color: '#0f172a', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>URGENT ASSIGNMENT</h2>
              <p style={{ color: '#64748b', fontSize: 16, marginBottom: 24 }}>
                <strong>{urgentGuest}</strong> has been assigned to you. This requires your immediate attention!
              </p>
              <button
                className="btn btn-danger btn-full"
                style={{ padding: '16px 24px', fontSize: 18, textTransform: 'uppercase', letterSpacing: 1 }}
                onClick={acknowledgeAlarm}
              >
                Acknowledge & Stop Alarm
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes bellRing {
            0%,100% { transform: rotate(0); }
            20% { transform: rotate(-20deg); }
            40% { transform: rotate(20deg); }
            60% { transform: rotate(-10deg); }
            80% { transform: rotate(10deg); }
          }
          @keyframes flashBackground {
            from { background: rgba(239, 68, 68, 0.85); }
            to { background: rgba(185, 28, 28, 0.95); }
          }
          @keyframes popIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes wobble {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
          }
        `}</style>
      </div>
    </AssignmentContext.Provider>
  );
}
