import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, IndianRupee, UserCheck, TrendingUp, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import StatsCard from '../components/StatsCard';
import Modal from '../components/Modal';
import DateRangePicker from '../components/DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getDashboardStats } from '../lib/supabaseDB';
import { formatDate } from '../utils/dateUtils';

const COLORS = ['#059669', '#10b981', '#34d399', '#0d9488', '#6ee7b7', '#047857'];

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => resolve(img);
  img.onerror = (e) => reject(e);
  img.src = url;
});

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

async function exportToPDF(data, filename) {
  if (!data.length) return;
  const doc = new jsPDF('p', 'pt', 'a4');
  let logoImg = null;
  try { logoImg = await loadImage('/IMG_2458.PNG'); } catch (e) { }

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const MARGIN = 40;

  const drawHeader = () => {
    let titleY = MARGIN + 25;
    if (logoImg) {
      const logoHeight = 40;
      const logoWidth = logoHeight * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, 'PNG', (PAGE_WIDTH - logoWidth) / 2, MARGIN, logoWidth, logoHeight);
      titleY = MARGIN + logoHeight + 20;
    } else {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('CITY GUEST', PAGE_WIDTH / 2, MARGIN, { align: 'center' });
    }
    const title = filename.replace(/-/g, ' ').toUpperCase();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, PAGE_WIDTH / 2, titleY, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(MARGIN, titleY + 15, PAGE_WIDTH - MARGIN, titleY + 15);
  };

  // Capture charts if they exist
  const chartsEl = document.getElementById('perf-charts');
  let chartsImg = null;
  let startY = 140;

  if (chartsEl) {
    try {
      const canvas = await html2canvas(chartsEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      chartsImg = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Failed to capture charts', e);
    }
  }

  if (chartsImg) {
    const imgProps = doc.getImageProperties(chartsImg);
    const imgWidth = PAGE_WIDTH - (MARGIN * 2);
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    doc.addImage(chartsImg, 'PNG', MARGIN, startY, imgWidth, imgHeight);
    startY += imgHeight + 20;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => row[h]));

  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: rows,
    theme: 'grid',
    margin: { top: 140, left: MARGIN, right: MARGIN },
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
    didDrawPage: drawHeader
  });

  doc.save(`${filename}.pdf`);
}

const ExportButtons = ({ getData, filename }) => (
  <div style={{ display: 'flex', gap: '8px' }}>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FileSpreadsheet size={14} /> Excel
    </button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Download size={14} /> CSV
    </button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToPDF(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FileText size={14} /> PDF
    </button>
  </div>
);

const TAB_STYLES = (active) => ({
  padding: '8px 20px',
  borderRadius: '10px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  transition: 'all 0.2s',
  background: active ? 'var(--primary)' : 'transparent',
  color: active ? '#fff' : 'var(--text-muted)',
});

const PerfTable = ({ rows, fmt, label }) => (
  <table className="table">
    <thead>
      <tr>
        <th>{label} Name</th>
        <th>Total Entries</th>
        <th>Total Donations</th>
        <th>Last Entry</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i}>
          <td style={{ fontWeight: 600 }}>{r.name}</td>
          <td>
            <span style={{
              background: 'var(--primary-light)', color: 'var(--primary)',
              padding: '2px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13,
            }}>{r.totalEntries}</span>
          </td>
          <td>₹{fmt(r.totalDonations)}</td>
          <td>{r.lastEntry ? formatDate(r.lastEntry) : '—'}</td>
        </tr>
      ))}
      {rows.length === 0 && (
        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No data yet</td></tr>
      )}
    </tbody>
  </table>
);

const PerfSection = ({ stats, fmt }) => {
  const [perfTab, setPerfTab] = React.useState('sub');
  const [dateFilter, setDateFilter] = React.useState('all');
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');

  const isSub = perfTab === 'sub';

  const filterGuests = React.useCallback(() => {
    let g = stats?.rawGuests || [];
    if (dateFilter === 'all') return g;

    const now = new Date();
    if (dateFilter === 'week') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      return g.filter(x => new Date(x.created_at) >= startOfWeek);
    }
    if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return g.filter(x => new Date(x.created_at) >= startOfMonth);
    }
    if (dateFilter === 'custom') {
      if (!customStart || !customEnd) return g;
      const start = new Date(customStart + 'T00:00:00.000Z');
      const end = new Date(customEnd + 'T23:59:59.999Z');
      return g.filter(x => {
        const d = new Date(x.created_at);
        return d >= start && d <= end;
      });
    }
    return g;
  }, [stats?.rawGuests, dateFilter, customStart, customEnd]);

  const filteredGuests = filterGuests();
  const u = stats?.allUsers || [];

  const subAdminPerfLocal = u.filter(x => x.role === 'sub_admin').map(x => {
    const ug = filteredGuests.filter(r => r.created_by === x.id);
    const last = [...ug].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {
      name: x.name,
      totalEntries: ug.length,
      totalDonations: ug.reduce((s, r) => s + (r.donation_amount || 0), 0),
      lastEntry: last?.created_at || null,
    };
  }).sort((a, b) => b.totalEntries - a.totalEntries);

  const superAdminPerfLocal = u.filter(x => x.role === 'super_admin').map(x => {
    const ug = filteredGuests.filter(r => r.created_by === x.id);
    const last = [...ug].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {
      name: x.name,
      totalEntries: ug.length,
      totalDonations: ug.reduce((s, r) => s + (r.donation_amount || 0), 0),
      lastEntry: last?.created_at || null,
    };
  }).sort((a, b) => b.totalEntries - a.totalEntries);

  const rows = isSub ? subAdminPerfLocal : superAdminPerfLocal;
  const label = isSub ? 'Sub Admin' : 'Super Admin';
  const barColor = isSub ? '#8b5cf6' : '#0ea5e9';
  const filename = isSub ? 'subadmin-performance' : 'superadmin-performance';
  const displayFilename = dateFilter === 'all' ? filename : `${filename}-${dateFilter}`;

  return (
    <div style={{ marginTop: 24 }}>
      {/* Chart */}
      {rows.length > 0 && (
        <div id="perf-charts" className="charts-grid" style={{ marginBottom: 0, padding: '16px', background: 'var(--background)' }}>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Guests Handled – {label}</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="totalEntries" fill={barColor} radius={[4, 4, 0, 0]} name="Total Entries" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Donations Collected – {label}</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rows} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(val) => `₹${fmt(val)}`} />
                  <Bar dataKey="totalDonations" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Donations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table with tabs */}
      <div className="card mt-4">
        <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--background)', padding: 4, borderRadius: 12 }}>
              <button style={TAB_STYLES(perfTab === 'sub')} onClick={() => setPerfTab('sub')}>
                👤 Sub Admin
              </button>
              <button style={TAB_STYLES(perfTab === 'super')} onClick={() => setPerfTab('super')}>
                👑 Super Admin
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select className="form-input no-icon" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, minWidth: 130 }}>
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {dateFilter === 'custom' && (
                <DateRangePicker
                  startDate={customStart} endDate={customEnd}
                  onStartDateChange={setCustomStart} onEndDateChange={setCustomEnd}
                />
              )}

              <ExportButtons
                getData={() => rows.map(r => ({
                  [label]: r.name,
                  'Total Entries': r.totalEntries,
                  'Total Donations (₹)': r.totalDonations,
                  'Last Entry': r.lastEntry ? formatDate(r.lastEntry) : '—',
                }))}
                filename={displayFilename}
              />
            </div>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', padding: 0 }}>
          <div style={{ padding: '0 8px' }}>
            <PerfTable rows={rows} fmt={fmt} label={label} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Photo details modal state
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

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

          {stats?.recentPhotos?.length > 0 && (
            <div className="card mt-4" style={{ borderRadius: '24px', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
              <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <h3 className="card-title" style={{ fontSize: '18px', fontWeight: 700 }}>Recent Guest Photos</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '16px', paddingTop: '8px' }} className="hide-scrollbar">
                  {stats.recentPhotos.map(guest => (
                    <div key={guest.id}
                      onClick={() => { setSelectedGuest(guest); setPhotoModalOpen(true); }}
                      style={{ cursor: 'pointer', textAlign: 'center', width: '88px', flexShrink: 0, transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 10px', overflow: 'hidden', border: '3px solid var(--primary)', background: 'var(--surface-2)', padding: '2px' }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                          <img src={guest.photo_url} alt={guest.guest_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {guest.guest_name}
                      </div>
                    </div>
                  ))}
                  
                  {/* "All Photos" option */}
                  <div 
                    style={{ cursor: 'pointer', textAlign: 'center', width: '88px', flexShrink: 0, transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    onClick={() => { /* Handle navigation to all photos if needed */ }}
                  >
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                      All Photos
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          <div className="charts-grid mt-4">
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
          </div>


          {profile?.role === 'super_admin' && (stats?.subAdminPerf?.length > 0 || stats?.superAdminPerf?.length > 0) && (
            <PerfSection stats={stats} fmt={fmt} />
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

      {/* Guest Details Modal */}
      {selectedGuest && (
        <Modal isOpen={photoModalOpen} onClose={() => { setPhotoModalOpen(false); setTimeout(() => setSelectedGuest(null), 200); }} title="Guest Details">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--primary)', marginBottom: '16px' }}>
              <img src={selectedGuest.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text)' }}>{selectedGuest.guest_name}</h3>
            {selectedGuest.occupation && <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontWeight: 500 }}>{selectedGuest.occupation}</p>}
          </div>

          <div className="form-grid" style={{ gap: '16px' }}>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Phone</span>
              <strong>{selectedGuest.phone_number || '—'}</strong>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Location</span>
              <strong>{selectedGuest.place}{selectedGuest.district ? `, ${selectedGuest.district}` : ''}</strong>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Purpose</span>
              <strong>{selectedGuest.purpose}</strong>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Donation</span>
              <strong style={{ color: 'var(--success)' }}>₹{fmt(selectedGuest.donation_amount)}</strong>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Picked Date</span>
              <strong>{selectedGuest.picked_date ? formatDate(selectedGuest.picked_date) : '—'}</strong>
            </div>
            <div>
              <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Handled By</span>
              <strong>{selectedGuest.handled_by || '—'}</strong>
            </div>
            {selectedGuest.remarks && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted" style={{ fontSize: '0.875rem', display: 'block' }}>Remarks</span>
                <strong>{selectedGuest.remarks}</strong>
              </div>
            )}
          </div>
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setPhotoModalOpen(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
