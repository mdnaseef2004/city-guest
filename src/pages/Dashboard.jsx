import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, IndianRupee, UserCheck, TrendingUp, Download, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import StatsCard from '../components/StatsCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getDashboardStats } from '../lib/supabaseDB';

const COLORS = ['#059669', '#10b981', '#34d399', '#0d9488', '#6ee7b7', '#047857'];

function exportToExcel(data, filename) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}.csv`;
  a.click();
}

const ExportButtons = ({ getData, filename }) => (
  <div style={{ display: 'flex', gap: '8px' }}>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FileSpreadsheet size={14} /> Excel
    </button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Download size={14} /> CSV
    </button>
  </div>
);

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatsRef = useRef(null);

  const fetchStats = useCallback(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Keep ref always pointing to latest fetchStats
  useEffect(() => { fetchStatsRef.current = fetchStats; }, [fetchStats]);

  // Initial fetch
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Real-time sync — created once, uses ref to avoid stale closures
  useEffect(() => {
    const channelName = `dashboard_stats_${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_visits' }, () => {
        fetchStatsRef.current?.();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {profile?.name}!</p>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="stats-grid">
            <StatsCard title="Total Guests" value={fmt(stats?.totalGuests)} icon={Users} color="primary" subtitle="All time" />
            <StatsCard title="Total Donations" value={`₹${fmt(stats?.totalDonations)}`} icon={IndianRupee} color="success" subtitle="All time" />
            <StatsCard title="Today's Guests" value={fmt(stats?.todayGuests)} icon={UserCheck} color="info" subtitle="Today" />
            <StatsCard title="Monthly Donations" value={`₹${fmt(stats?.monthlyDonations)}`} icon={TrendingUp} color="warning" subtitle="This month" />
          </div>

          <div className="charts-grid">
            {stats?.guestsByPlace?.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Guests by Place</h3></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.guestsByPlace} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="place" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} name="Guests" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {stats?.guestsByPurpose?.length > 0 && (
              <div className="card">
                <div className="card-header"><h3 className="card-title">Guests by Purpose</h3></div>
                <div className="card-body">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={stats.guestsByPurpose} dataKey="count" nameKey="purpose" cx="50%" cy="50%" outerRadius={90}
                        label={({ purpose, percent }) => `${purpose} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {stats.guestsByPurpose.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {profile?.role === 'super_admin' && stats?.subAdminPerf?.length > 0 && (
              <>
                <div className="card">
                  <div className="card-header"><h3 className="card-title">Guests Handled by Sub Admin</h3></div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.subAdminPerf} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Bar dataKey="totalEntries" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Total Entries" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><h3 className="card-title">Donations by Sub Admin</h3></div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.subAdminPerf} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(val) => `₹${fmt(val)}`} />
                        <Bar dataKey="totalDonations" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Donations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>

          {profile?.role === 'super_admin' && stats?.subAdminPerf?.length > 0 && (
            <div className="card mt-4">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Sub Admin Performance</h3>
                <ExportButtons 
                  getData={() => stats.subAdminPerf.map(sa => ({
                    'Sub Admin': sa.name,
                    'Total Entries': sa.totalEntries,
                    'Total Donations (₹)': sa.totalDonations,
                    'Last Entry': sa.lastEntry ? new Date(sa.lastEntry).toLocaleDateString('en-IN') : '—'
                  }))} 
                  filename="subadmin-performance" 
                />
              </div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Total Entries</th><th>Total Donations</th><th>Last Entry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.subAdminPerf.map((sa, i) => (
                      <tr key={i}>
                        <td>{sa.name}</td>
                        <td>{sa.totalEntries}</td>
                        <td>₹{fmt(sa.totalDonations)}</td>
                        <td>{sa.lastEntry ? new Date(sa.lastEntry).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {stats?.totalGuests === 0 && (
            <div className="empty-state" style={{ marginTop: '2rem' }}>
              <Users size={40} />
              <h3>No data yet</h3>
              <p>Start by adding your first guest entry!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
