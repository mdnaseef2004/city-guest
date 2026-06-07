import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import DateRangePicker from '../components/DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { getAllGuestsForReports, getUsers } from '../lib/supabaseDB';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

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

const Reports = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(false);

  // Daily
  const [dailyDate, setDailyDate] = useState(today());
  const [dailyRows, setDailyRows] = useState([]);

  // Monthly
  const [monthVal, setMonthVal] = useState(thisMonth());
  const [monthRows, setMonthRows] = useState([]);

  // Donation
  const [donStart, setDonStart] = useState('');
  const [donEnd, setDonEnd] = useState('');
  const [donRows, setDonRows] = useState([]);

  // Sub Admin
  const [saStart, setSaStart] = useState('');
  const [saEnd, setSaEnd] = useState('');
  const [saRows, setSaRows] = useState([]);

  // Super Admin
  const [suStart, setSuStart] = useState('');
  const [suEnd, setSuEnd] = useState('');
  const [suRows, setSuRows] = useState([]);

  const [users, setUsers] = useState([]);

  // Load users for super_admin
  useEffect(() => {
    if (profile?.role === 'super_admin') getUsers().then(setUsers);
  }, [profile]);

  // Daily
  useEffect(() => {
    if (tab !== 'daily') return;
    setLoading(true);
    getAllGuestsForReports({ startDate: dailyDate, endDate: dailyDate })
      .then(setDailyRows).catch(console.error).finally(() => setLoading(false));
  }, [tab, dailyDate]);

  // Monthly
  useEffect(() => {
    if (tab !== 'monthly') return;
    setLoading(true);
    
    const [yyyy, mm] = monthVal.split('-');
    const lastDay = new Date(yyyy, mm, 0).getDate();
    
    getAllGuestsForReports({ startDate: `${monthVal}-01`, endDate: `${monthVal}-${lastDay}` })
      .then(guests => {
        const byDate = {};
        guests.forEach(g => {
          const d = g.created_at.slice(0, 10);
          if (!byDate[d]) byDate[d] = { date: d, guests: 0, donations: 0 };
          byDate[d].guests++;
          byDate[d].donations += g.donation_amount || 0;
        });
        setMonthRows(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
      }).catch(console.error).finally(() => setLoading(false));
  }, [tab, monthVal]);

  // Donation
  useEffect(() => {
    if (tab !== 'donation') return;
    setLoading(true);
    getAllGuestsForReports({ startDate: donStart, endDate: donEnd, onlyDonations: true })
      .then(rows => setDonRows([...rows].sort((a, b) => b.donation_amount - a.donation_amount)))
      .catch(console.error).finally(() => setLoading(false));
  }, [tab, donStart, donEnd]);

  // Admin Reports
  useEffect(() => {
    if ((tab !== 'subadmin' && tab !== 'superadmin') || profile?.role !== 'super_admin') return;
    setLoading(true);
    const isSub = tab === 'subadmin';
    const start = isSub ? saStart : suStart;
    const end = isSub ? saEnd : suEnd;

    getAllGuestsForReports({ startDate: start, endDate: end })
      .then(guests => {
        const map = {};
        guests.forEach(g => {
          const userId = g.created_by;
          const u = users.find(user => user.id === userId);
          const expectedRole = isSub ? 'sub_admin' : 'super_admin';
          
          if (!u || u.role !== expectedRole) return;

          if (!map[userId]) {
            map[userId] = { name: u.name, entries: 0, donations: 0 };
          }
          map[userId].entries++;
          map[userId].donations += g.donation_amount || 0;
        });
        const rows = Object.values(map).sort((a, b) => b.entries - a.entries);
        if (isSub) setSaRows(rows); else setSuRows(rows);
      }).catch(console.error).finally(() => setLoading(false));
  }, [tab, saStart, saEnd, suStart, suEnd, users, profile]);

  const dailyTotal = dailyRows.reduce((s, r) => s + (r.donation_amount || 0), 0);
  const monthTotal = monthRows.reduce((s, r) => ({ guests: s.guests + r.guests, donations: s.donations + r.donations }), { guests: 0, donations: 0 });
  const donTotal = donRows.reduce((s, r) => s + (r.donation_amount || 0), 0);
  const donMax = donRows[0]?.donation_amount || 0;
  const donAvg = donRows.length ? donTotal / donRows.length : 0;

  const tabs = [
    { id: 'daily', label: 'Daily' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'donation', label: 'Donation' },
    ...(profile?.role === 'super_admin' ? [
      { id: 'subadmin', label: 'Sub Admin' },
      { id: 'superadmin', label: 'Super Admin' }
    ] : []),
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Generate and export data reports</p>
      </div>

      {/* Tabs */}
      <div className="tabs mb-4">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && <div className="loading-screen"><div className="spinner"></div></div>}

      {/* Daily */}
      {tab === 'daily' && !loading && (
        <div>
          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Select Date</label>
                <input type="date" className="form-input no-icon" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{ width: 'auto' }} />
              </div>
              <div style={{ marginTop: 'auto' }}>
                <ExportButtons getData={() => dailyRows.map(r => ({ 'Guest Name': r.guest_name, Phone: r.phone_number || '', Address: r.place, Purpose: r.purpose, 'Donation (₹)': r.donation_amount, 'Picked From': r.picked_from, 'Handled By': r.handled_by, 'Returned': r.guest_returned, 'Entered By': r.profiles?.name, Time: new Date(r.created_at).toLocaleTimeString('en-IN') }))} filename={`daily-report-${dailyDate}`} />
              </div>
            </div>
          </div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Guests</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{dailyRows.length}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(dailyTotal)}</div></div></div>
          </div>
          <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {dailyRows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No records for this date.</p></div> : (
              <table className="table"><thead><tr><th>Guest Name</th><th>Address</th><th>Purpose</th><th>Donation</th><th>Time</th><th>Entered By</th></tr></thead>
                <tbody>{dailyRows.map(r => <tr key={r.id}><td>{r.guest_name}</td><td>{r.place}</td><td>{r.purpose}</td><td>₹{fmt(r.donation_amount)}</td><td>{new Date(r.created_at).toLocaleTimeString('en-IN')}</td><td>{r.profiles?.name}</td></tr>)}</tbody>
              </table>
            )}
          </div></div>
        </div>
      )}

      {/* Monthly */}
      {tab === 'monthly' && !loading && (
        <div>
          <div className="card mb-4">
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Select Month</label>
                <input type="month" className="form-input no-icon" value={monthVal} onChange={e => setMonthVal(e.target.value)} style={{ width: 'auto' }} />
              </div>
              <div style={{ marginTop: 'auto' }}>
                <ExportButtons getData={() => monthRows.map(r => ({ Date: r.date, 'Guest Count': r.guests, 'Total Donations (₹)': r.donations }))} filename={`monthly-report-${monthVal}`} />
              </div>
            </div>
          </div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Guests</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{fmt(monthTotal.guests)}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(monthTotal.donations)}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Avg Daily Guests</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{monthRows.length ? (monthTotal.guests / monthRows.length).toFixed(1) : 0}</div></div></div>
          </div>
          <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {monthRows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No records this month.</p></div> : (
              <table className="table"><thead><tr><th>Date</th><th>Guest Count</th><th>Donations (₹)</th></tr></thead>
                <tbody>{monthRows.map(r => <tr key={r.date}><td>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN')}</td><td>{r.guests}</td><td>₹{fmt(r.donations)}</td></tr>)}</tbody>
              </table>
            )}
          </div></div>
        </div>
      )}

      {/* Donation */}
      {tab === 'donation' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={donStart} endDate={donEnd} onStartDateChange={setDonStart} onEndDateChange={setDonEnd} label="Date Range" />
            <ExportButtons getData={() => donRows.map(r => ({ 'Guest Name': r.guest_name, Address: r.place, 'Donation (₹)': r.donation_amount, Date: r.created_at.slice(0, 10), 'Entered By': r.profiles?.name }))} filename="donation-report" />
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(donTotal)}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Average Donation</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(donAvg)}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Highest Donation</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(donMax)}</div></div></div>
          </div>
          <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {donRows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No donation records found.</p></div> : (
              <table className="table"><thead><tr><th>Guest Name</th><th>Address</th><th>Donation</th><th>Date</th><th>Entered By</th></tr></thead>
                <tbody>{donRows.map(r => <tr key={r.id}><td>{r.guest_name}</td><td>{r.place}</td><td><strong>₹{fmt(r.donation_amount)}</strong></td><td>{r.created_at.slice(0, 10)}</td><td>{r.profiles?.name}</td></tr>)}</tbody>
              </table>
            )}
          </div></div>
        </div>
      )}

      {/* Sub Admin */}
      {tab === 'subadmin' && profile?.role === 'super_admin' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={saStart} endDate={saEnd} onStartDateChange={setSaStart} onEndDateChange={setSaEnd} label="Date Range" />
            <ExportButtons getData={() => saRows.map(r => ({ 'Sub Admin': r.name, 'Total Entries': r.entries, 'Total Donations (₹)': r.donations, 'Avg Donation (₹)': r.entries ? (r.donations / r.entries).toFixed(2) : 0 }))} filename="subadmin-report" />
          </div></div>
          <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {saRows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No sub admin data found.</p></div> : (
              <table className="table"><thead><tr><th>Sub Admin</th><th>Total Entries</th><th>Total Donations</th><th>Avg Donation</th></tr></thead>
                <tbody>{saRows.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.entries}</td><td>₹{fmt(r.donations)}</td><td>₹{fmt(r.entries ? r.donations / r.entries : 0)}</td></tr>)}</tbody>
              </table>
            )}
          </div></div>
        </div>
      )}

      {/* Super Admin */}
      {tab === 'superadmin' && profile?.role === 'super_admin' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={suStart} endDate={suEnd} onStartDateChange={setSuStart} onEndDateChange={setSuEnd} label="Date Range" />
            <ExportButtons getData={() => suRows.map(r => ({ 'Super Admin': r.name, 'Total Entries': r.entries, 'Total Donations (₹)': r.donations, 'Avg Donation (₹)': r.entries ? (r.donations / r.entries).toFixed(2) : 0 }))} filename="superadmin-report" />
          </div></div>
          <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
            {suRows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No super admin data found.</p></div> : (
              <table className="table"><thead><tr><th>Super Admin</th><th>Total Entries</th><th>Total Donations</th><th>Avg Donation</th></tr></thead>
                <tbody>{suRows.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.entries}</td><td>₹{fmt(r.donations)}</td><td>₹{fmt(r.entries ? r.donations / r.entries : 0)}</td></tr>)}</tbody>
              </table>
            )}
          </div></div>
        </div>
      )}
    </div>
  );
};

export default Reports;
