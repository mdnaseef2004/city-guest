import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DateRangePicker from '../components/DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { getAllGuestsForReports, getUsers } from '../lib/supabaseDB';
import { formatDate } from '../utils/dateUtils';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => resolve(img);
  img.onerror = (e) => reject(e);
  img.src = url;
});

function exportToExcel(data, filename) {
  if (!data.length) return;
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

async function exportToPDF(data, filename, title) {
  if (!data.length) return;
  const doc = new jsPDF('l', 'pt', 'a4');
  let logoImg = null;
  try { logoImg = await loadImage('/IMG_2458.PNG'); } catch (e) {}

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
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, titleY, { align: 'center' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(MARGIN, titleY + 15, PAGE_WIDTH - MARGIN, titleY + 15);
  };

  const keys = Object.keys(data[0]);
  const bodyData = data.map(r => keys.map(k => String(r[k] ?? '')));

  autoTable(doc, {
    startY: 140,
    head: [keys],
    body: bodyData,
    margin: { top: 140, left: MARGIN, right: MARGIN },
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    didDrawPage: drawHeader
  });

  doc.save(`${filename}.pdf`);
}

const ExportButtons = ({ getData, filename, title }) => (
  <div style={{ display: 'flex', gap: '8px' }}>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToPDF(getData(), filename, title)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FileText size={14} /> PDF
    </button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FileSpreadsheet size={14} /> Excel
    </button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(getData(), filename)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Download size={14} /> CSV
    </button>
  </div>
);

const DetailedTable = ({ rows }) => (
  <div className="card"><div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
    {rows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No records found.</p></div> : (
      <table className="table"><thead><tr>
        <th>Guest Name</th><th>Address</th><th>State/Country</th><th>Donation</th><th>Phone Number</th><th>Handled By</th><th>Entered By</th><th>Date</th>
      </tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}>
          <td>{r.guest_name}</td><td>{r.place}</td><td>{r.is_international ? r.country : (r.state || '—')}</td><td><strong>₹{fmt(r.donation_amount)}</strong></td>
          <td>{r.phone_number || r.mobile_number || '—'}</td><td>{r.handled_by || '—'}</td><td>{r.profiles?.name}</td><td>{formatDate(r.created_at)}</td>
        </tr>)}</tbody>
      </table>
    )}
  </div></div>
);

const Reports = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(false);

  const [dailyDate, setDailyDate] = useState(today());
  const [dailyRows, setDailyRows] = useState([]);

  const [monthVal, setMonthVal] = useState(thisMonth());
  const [monthRows, setMonthRows] = useState([]);

  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customRows, setCustomRows] = useState([]);

  const [donStart, setDonStart] = useState('');
  const [donEnd, setDonEnd] = useState('');
  const [donRows, setDonRows] = useState([]);

  const [saStart, setSaStart] = useState('');
  const [saEnd, setSaEnd] = useState('');
  const [saRows, setSaRows] = useState([]);

  const [suStart, setSuStart] = useState('');
  const [suEnd, setSuEnd] = useState('');
  const [suRows, setSuRows] = useState([]);

  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (profile?.role === 'super_admin') getUsers().then(setUsers);
  }, [profile]);

  useEffect(() => {
    if (tab !== 'daily') return;
    setLoading(true);
    getAllGuestsForReports({ startDate: dailyDate, endDate: dailyDate })
      .then(setDailyRows).catch(console.error).finally(() => setLoading(false));
  }, [tab, dailyDate]);

  useEffect(() => {
    if (tab !== 'monthly') return;
    setLoading(true);
    const [yyyy, mm] = monthVal.split('-');
    const lastDay = new Date(yyyy, mm, 0).getDate();
    getAllGuestsForReports({ startDate: `${monthVal}-01`, endDate: `${monthVal}-${lastDay}` })
      .then(setMonthRows).catch(console.error).finally(() => setLoading(false));
  }, [tab, monthVal]);

  useEffect(() => {
    if (tab !== 'custom') return;
    setLoading(true);
    getAllGuestsForReports({ startDate: customStart, endDate: customEnd })
      .then(setCustomRows).catch(console.error).finally(() => setLoading(false));
  }, [tab, customStart, customEnd]);

  useEffect(() => {
    if (tab !== 'donation') return;
    setLoading(true);
    getAllGuestsForReports({ startDate: donStart, endDate: donEnd, onlyDonations: true })
      .then(rows => setDonRows([...rows].sort((a, b) => b.donation_amount - a.donation_amount)))
      .catch(console.error).finally(() => setLoading(false));
  }, [tab, donStart, donEnd]);

  useEffect(() => {
    if ((tab !== 'subadmin' && tab !== 'superadmin') || profile?.role !== 'super_admin') return;
    setLoading(true);
    const isSub = tab === 'subadmin';
    const start = isSub ? saStart : suStart;
    const end = isSub ? saEnd : suEnd;

    getAllGuestsForReports({ startDate: start, endDate: end })
      .then(guests => {
        const filtered = guests.filter(g => {
          const u = users.find(user => user.id === g.created_by);
          const expectedRole = isSub ? 'sub_admin' : 'super_admin';
          return u && u.role === expectedRole;
        });
        if (isSub) setSaRows(filtered); else setSuRows(filtered);
      }).catch(console.error).finally(() => setLoading(false));
  }, [tab, saStart, saEnd, suStart, suEnd, users, profile]);

  const mapExportData = (rows) => rows.map(r => ({
    'Guest Name': r.guest_name, 'Address': r.place, 'State': r.is_international ? '' : r.state || '', 'Country': r.is_international ? r.country : '',
    'Donation (₹)': r.donation_amount || 0, 'Phone Number': r.phone_number || r.mobile_number || '',
    'Handled By': r.handled_by || '', 'Entered By': r.profiles?.name || 'Unknown', 'Date Entered': formatDate(r.created_at)
  }));

  const tabs = [
    { id: 'daily', label: 'Daily' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'custom', label: 'Custom Range' },
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
        <p className="page-subtitle">Generate and export detailed data reports</p>
      </div>

      <div className="tabs mb-4">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'tab-active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && <div className="loading-screen"><div className="spinner"></div></div>}

      {/* Daily */}
      {tab === 'daily' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Date</label>
              <input type="date" className="form-input no-icon" value={dailyDate} onChange={e => setDailyDate(e.target.value)} style={{ width: 'auto' }} />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <ExportButtons getData={() => mapExportData(dailyRows)} filename={`Daily_Report_${dailyDate}`} title={`Daily Guest Report - ${formatDate(dailyDate)}`} />
            </div>
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Guests</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{dailyRows.length}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(dailyRows.reduce((s, r) => s + (r.donation_amount || 0), 0))}</div></div></div>
          </div>
          <DetailedTable rows={dailyRows} />
        </div>
      )}

      {/* Monthly */}
      {tab === 'monthly' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Month</label>
              <input type="month" className="form-input no-icon" value={monthVal} onChange={e => setMonthVal(e.target.value)} style={{ width: 'auto' }} />
            </div>
            <div style={{ marginTop: 'auto' }}>
              <ExportButtons getData={() => mapExportData(monthRows)} filename={`Monthly_Report_${monthVal}`} title={`Monthly Guest Report - ${new Date(monthVal+'-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}`} />
            </div>
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Guests</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{monthRows.length}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(monthRows.reduce((s, r) => s + (r.donation_amount || 0), 0))}</div></div></div>
          </div>
          <DetailedTable rows={monthRows} />
        </div>
      )}

      {/* Custom Range */}
      {tab === 'custom' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={customStart} endDate={customEnd} onStartDateChange={setCustomStart} onEndDateChange={setCustomEnd} label="Date Range" />
            <ExportButtons getData={() => mapExportData(customRows)} filename="Custom_Report" title="Custom Date Range Guest Report" />
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Guests</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{customRows.length}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(customRows.reduce((s, r) => s + (r.donation_amount || 0), 0))}</div></div></div>
          </div>
          <DetailedTable rows={customRows} />
        </div>
      )}

      {/* Donation */}
      {tab === 'donation' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={donStart} endDate={donEnd} onStartDateChange={setDonStart} onEndDateChange={setDonEnd} label="Date Range" />
            <ExportButtons getData={() => mapExportData(donRows)} filename="Donation_Report" title="Donation Guest Report" />
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(donRows.reduce((s, r) => s + (r.donation_amount || 0), 0))}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Highest Donation</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(donRows[0]?.donation_amount || 0)}</div></div></div>
          </div>
          <DetailedTable rows={donRows} />
        </div>
      )}

      {/* Sub Admin */}
      {tab === 'subadmin' && profile?.role === 'super_admin' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={saStart} endDate={saEnd} onStartDateChange={setSaStart} onEndDateChange={setSaEnd} label="Date Range" />
            <ExportButtons getData={() => mapExportData(saRows)} filename="SubAdmin_Report" title="Sub Admin Entries Report" />
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Entries</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{saRows.length}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(saRows.reduce((s, r) => s + (r.donation_amount || 0), 0))}</div></div></div>
          </div>
          <DetailedTable rows={saRows} />
        </div>
      )}

      {/* Super Admin */}
      {tab === 'superadmin' && profile?.role === 'super_admin' && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <DateRangePicker startDate={suStart} endDate={suEnd} onStartDateChange={setSuStart} onEndDateChange={setSuEnd} label="Date Range" />
            <ExportButtons getData={() => mapExportData(suRows)} filename="SuperAdmin_Report" title="Super Admin Entries Report" />
          </div></div>
          <div className="stats-grid mb-4">
            <div className="card"><div className="card-body"><div className="text-muted">Total Entries</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>{suRows.length}</div></div></div>
            <div className="card"><div className="card-body"><div className="text-muted">Total Donations</div><div style={{ fontSize: '2rem', fontWeight: 700 }}>₹{fmt(suRows.reduce((s, r) => s + (r.donation_amount || 0), 0))}</div></div></div>
          </div>
          <DetailedTable rows={suRows} />
        </div>
      )}

    </div>
  );
};

export default Reports;
