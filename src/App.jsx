import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

// ── Lazy-loaded pages (code-split per route for fast initial load) ──────────
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const AddGuest      = lazy(() => import('./pages/AddGuest'));
const GuestRecords  = lazy(() => import('./pages/GuestRecords'));
const Reports       = lazy(() => import('./pages/Reports'));
const UserManagement= lazy(() => import('./pages/UserManagement'));
const Assignments   = lazy(() => import('./pages/Assignments'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AddEvent      = lazy(() => import('./pages/AddEvent'));
const EventReports  = lazy(() => import('./pages/EventReports'));

// ── Full-screen loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Loading…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '12px',
              fontSize: '0.875rem', fontWeight: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={
                <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
              } />
              <Route path="/add-guest" element={
                <Suspense fallback={<PageLoader />}><AddGuest /></Suspense>
              } />
              <Route path="/guests" element={
                <Suspense fallback={<PageLoader />}><GuestRecords /></Suspense>
              } />
              <Route path="/add-event" element={
                <Suspense fallback={<PageLoader />}><AddEvent /></Suspense>
              } />
              <Route path="/assignments" element={
                <Suspense fallback={<PageLoader />}><Assignments /></Suspense>
              } />
              <Route path="/notifications" element={
                <Suspense fallback={<PageLoader />}><Notifications /></Suspense>
              } />
              <Route path="/reports" element={
                <Suspense fallback={<PageLoader />}><Reports /></Suspense>
              } />
              <Route path="/event-reports" element={
                <Suspense fallback={<PageLoader />}><EventReports /></Suspense>
              } />
              <Route path="/users" element={
                <ProtectedRoute requiredRole="super_admin">
                  <Suspense fallback={<PageLoader />}><UserManagement /></Suspense>
                </ProtectedRoute>
              } />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
