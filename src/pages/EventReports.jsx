import React, { useState, useEffect, useMemo } from "react";
import { Download, FileSpreadsheet, FileText, CalendarDays, Users, Building2, TrendingUp, Award } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DateRangePicker from "../components/DateRangePicker";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/dateUtils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#f43f5e", "#84cc16"];

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image(); img.crossOrigin = "Anonymous";
  img.onload = () => resolve(img); img.onerror = (e) => reject(e); img.src = url;
});

async function fetchEvents({ startDate, endDate } = {}) {
  let q = supabase.from("events").select("*, profiles:created_by(name)").order("event_date", { ascending: false });
  if (startDate) q = q.gte("event_date", startDate);
  if (endDate) q = q.lte("event_date", endDate);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function mapExport(rows) {
  return rows.map((r) => ({
    "Event Name": r.event_name,
    "Event Place": r.event_place,
    "Members Participated": r.members_count,
    "Organized By": r.organized_by,
    "Event Date": formatDate(r.event_date),
    "Handled By": r.handled_by || "",
    "Remarks": r.remarks || "",
    "Entered By": r.profiles?.name || "",
  }));
}

async function exportToPDF(data, filename, title) {
  if (!data.length) return;
  const doc = new jsPDF("l", "pt", "a4");
  let logoImg = null;
  try { logoImg = await loadImage("/IMG_2458.PNG"); } catch (e) {}
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const MARGIN = 40;
  const drawHeader = () => {
    let titleY = MARGIN + 25;
    if (logoImg) {
      const lh = 40; const lw = lh * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, "PNG", (PAGE_WIDTH - lw) / 2, MARGIN, lw, lh);
      titleY = MARGIN + lh + 20;
    } else {
      doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0);
      doc.text("CITY GUEST", PAGE_WIDTH / 2, MARGIN, { align: "center" });
    }
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, titleY, { align: "center" });
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(1);
    doc.line(MARGIN, titleY + 15, PAGE_WIDTH - MARGIN, titleY + 15);
  };
  const keys = Object.keys(data[0]);
  const bodyData = data.map((r) => keys.map((k) => String(r[k] ?? "")));
  autoTable(doc, {
    startY: 140, head: [keys], body: bodyData,
    margin: { top: 140, left: MARGIN, right: MARGIN },
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    didDrawPage: drawHeader,
  });
  doc.save(`${filename}.pdf`);
}

function exportToExcel(data, filename) {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Events");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(","), ...data.map((row) => keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${filename}.csv`; a.click();
}

const ExportButtons = ({ getData, filename, title }) => (
  <div style={{ display: "flex", gap: 8 }}>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToPDF(getData(), filename, title)} style={{ display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} /> PDF</button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToExcel(getData(), filename)} style={{ display: "flex", alignItems: "center", gap: 6 }}><FileSpreadsheet size={14} /> Excel</button>
    <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(getData(), filename)} style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={14} /> CSV</button>
  </div>
);

const EventTable = ({ rows }) => (
  <div className="card"><div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
    {rows.length === 0 ? <div className="empty-state" style={{ padding: 40 }}><p>No events found.</p></div> : (
      <table className="table"><thead><tr>
        <th>Event Name</th><th>Event Place</th><th>Members</th><th>Organized By</th><th>Event Date</th><th>Handled By</th><th>Entered By</th><th>Remarks</th>
      </tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}>
          <td><strong>{r.event_name}</strong></td>
          <td>{r.event_place}</td>
          <td><span style={{ fontWeight: 700, color: "var(--primary)" }}>{fmt(r.members_count)}</span></td>
          <td>{r.organized_by}</td>
          <td>{formatDate(r.event_date)}</td>
          <td>{r.handled_by || "—"}</td>
          <td>{r.profiles?.name || "—"}</td>
          <td>{r.remarks || "—"}</td>
        </tr>)}</tbody>
      </table>
    )}
  </div></div>
);

const StatCard = ({ icon: Icon, label, value, color = "var(--primary)" }) => (
  <div className="card">
    <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div className="text-muted" style={{ fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  </div>
);

const EventDashboard = ({ allRows }) => {
  const totalEvents = allRows.length;
  const totalMembers = allRows.reduce((s, r) => s + (r.members_count || 0), 0);
  const avgMembers = totalEvents > 0 ? Math.round(totalMembers / totalEvents) : 0;

  // Largest single event
  const biggest = allRows.reduce((best, r) => (!best || r.members_count > best.members_count ? r : best), null);

  // Monthly events bar chart (last 6 months)
  const monthlyData = useMemo(() => {
    const map = {};
    allRows.forEach((r) => {
      const key = r.event_date?.slice(0, 7);
      if (!key) return;
      if (!map[key]) map[key] = { month: key, events: 0, members: 0 };
      map[key].events += 1;
      map[key].members += r.members_count || 0;
    });
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((d) => ({ ...d, label: new Date(d.month + "-01").toLocaleString("en-US", { month: "short", year: "2-digit" }) }));
  }, [allRows]);

  // Events by place (pie)
  const placeData = useMemo(() => {
    const map = {};
    allRows.forEach((r) => {
      const key = r.event_place || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [allRows]);

  // Events by organizer
  const orgData = useMemo(() => {
    const map = {};
    allRows.forEach((r) => {
      const key = r.organized_by || "Unknown";
      map[key] = (map[key] || 0) + (r.members_count || 0);
    });
    return Object.entries(map).map(([name, members]) => ({ name, members })).sort((a, b) => b.members - a.members).slice(0, 5);
  }, [allRows]);

  // Top 5 events by members
  const topEvents = useMemo(() => [...allRows].sort((a, b) => b.members_count - a.members_count).slice(0, 5), [allRows]);

  // Recent 5 events
  const recentEvents = useMemo(() => [...allRows].sort((a, b) => new Date(b.event_date) - new Date(a.event_date)).slice(0, 5), [allRows]);

  if (totalEvents === 0) {
    return <div className="empty-state" style={{ padding: 60 }}><CalendarDays size={40} style={{ opacity: 0.3 }} /><p style={{ marginTop: 12 }}>No events recorded yet. Add events to see the dashboard.</p></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard icon={CalendarDays} label="Total Events" value={totalEvents} color="#10b981" />
        <StatCard icon={Users} label="Total Members" value={fmt(totalMembers)} color="#6366f1" />
        <StatCard icon={TrendingUp} label="Avg Members / Event" value={fmt(avgMembers)} color="#f59e0b" />
        <StatCard icon={Award} label="Largest Event" value={biggest ? fmt(biggest.members_count) : "—"} color="#ef4444" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>

        {/* Monthly Members Bar Chart */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Monthly Members Participated</h3>
            {monthlyData.length === 0 ? <p className="text-muted">No data</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="members" fill="#10b981" radius={[4, 4, 0, 0]} name="Members" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Events Count */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Monthly Event Count</h3>
            {monthlyData.length === 0 ? <p className="text-muted">No data</p> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="events" fill="#6366f1" radius={[4, 4, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Events by Place Pie */}
        {placeData.length > 0 && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Events by Place</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={placeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                    {placeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Members by Organizer */}
        {orgData.length > 0 && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Members by Organizer</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orgData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="members" radius={[0, 4, 4, 0]} name="Members">
                    {orgData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Top events + Recent events */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

        {/* Top events by members */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🏆 Top Events by Members</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topEvents.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.event_name}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{r.event_place} · {formatDate(r.event_date)}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "var(--primary)", flexShrink: 0 }}>{fmt(r.members_count)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent events */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>🕒 Recent Events</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentEvents.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--surface-2)", borderRadius: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CalendarDays size={18} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.event_name}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{r.organized_by} · {formatDate(r.event_date)}</div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 999, background: "rgba(16,185,129,0.12)", color: "#10b981", flexShrink: 0 }}>{fmt(r.members_count)} members</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventReports = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  const [allRows, setAllRows] = useState([]);
  const [dailyDate, setDailyDate] = useState(today());
  const [dailyRows, setDailyRows] = useState([]);
  const [monthVal, setMonthVal] = useState(thisMonth());
  const [monthRows, setMonthRows] = useState([]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customRows, setCustomRows] = useState([]);

  const load = (setter, params) => {
    setLoading(true);
    fetchEvents(params).then(setter).catch((e) => { console.error(e); }).finally(() => setLoading(false));
  };

  // Always load all events for dashboard
  useEffect(() => { load(setAllRows, {}); }, []);

  useEffect(() => { if (tab === "daily") load(setDailyRows, { startDate: dailyDate, endDate: dailyDate }); }, [tab, dailyDate]);
  useEffect(() => {
    if (tab !== "monthly") return;
    const [yyyy, mm] = monthVal.split("-");
    const lastDay = new Date(yyyy, mm, 0).getDate();
    load(setMonthRows, { startDate: `${monthVal}-01`, endDate: `${monthVal}-${lastDay}` });
  }, [tab, monthVal]);
  useEffect(() => { if (tab === "custom") load(setCustomRows, { startDate: customStart, endDate: customEnd }); }, [tab, customStart, customEnd]);

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "daily", label: "Daily" },
    { id: "monthly", label: "Monthly" },
    { id: "custom", label: "Custom Range" },
    { id: "all", label: "All Events" },
  ];

  const summaryCard = (label, value) => (
    <div className="card"><div className="card-body"><div className="text-muted">{label}</div><div style={{ fontSize: "2rem", fontWeight: 700 }}>{value}</div></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Event Reports</h1>
        <p className="page-subtitle">Dashboard and detailed event records</p>
      </div>

      <div className="tabs mb-4">
        {tabs.map((t) => <button key={t.id} className={`tab ${tab === t.id ? "tab-active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {loading && <div className="loading-screen"><div className="spinner"></div></div>}

      {/* Dashboard */}
      {tab === "dashboard" && !loading && <EventDashboard allRows={allRows} />}

      {/* Daily */}
      {tab === "daily" && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Date</label>
              <input type="date" className="form-input no-icon" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} style={{ width: "auto" }} />
            </div>
            <div style={{ marginTop: "auto" }}>
              <ExportButtons getData={() => mapExport(dailyRows)} filename={`Event_Daily_${dailyDate}`} title={`Daily Event Report - ${formatDate(dailyDate)}`} />
            </div>
          </div></div>
          <div className="stats-grid mb-4">
            {summaryCard("Total Events", dailyRows.length)}
            {summaryCard("Total Members", fmt(dailyRows.reduce((s, r) => s + (r.members_count || 0), 0)))}
          </div>
          <EventTable rows={dailyRows} />
        </div>
      )}

      {/* Monthly */}
      {tab === "monthly" && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Select Month</label>
              <input type="month" className="form-input no-icon" value={monthVal} onChange={(e) => setMonthVal(e.target.value)} style={{ width: "auto" }} />
            </div>
            <div style={{ marginTop: "auto" }}>
              <ExportButtons getData={() => mapExport(monthRows)} filename={`Event_Monthly_${monthVal}`} title={`Monthly Event Report - ${new Date(monthVal + "-01").toLocaleString("en-US", { month: "long", year: "numeric" })}`} />
            </div>
          </div></div>
          <div className="stats-grid mb-4">
            {summaryCard("Total Events", monthRows.length)}
            {summaryCard("Total Members", fmt(monthRows.reduce((s, r) => s + (r.members_count || 0), 0)))}
          </div>
          <EventTable rows={monthRows} />
        </div>
      )}

      {/* Custom Range */}
      {tab === "custom" && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <DateRangePicker startDate={customStart} endDate={customEnd} onStartDateChange={setCustomStart} onEndDateChange={setCustomEnd} label="Date Range" />
            <ExportButtons getData={() => mapExport(customRows)} filename="Event_Custom_Report" title="Custom Date Range Event Report" />
          </div></div>
          <div className="stats-grid mb-4">
            {summaryCard("Total Events", customRows.length)}
            {summaryCard("Total Members", fmt(customRows.reduce((s, r) => s + (r.members_count || 0), 0)))}
          </div>
          <EventTable rows={customRows} />
        </div>
      )}

      {/* All Events */}
      {tab === "all" && !loading && (
        <div>
          <div className="card mb-4"><div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <ExportButtons getData={() => mapExport(allRows)} filename="All_Events_Report" title="All Events Report" />
          </div></div>
          <div className="stats-grid mb-4">
            {summaryCard("Total Events", allRows.length)}
            {summaryCard("Total Members", fmt(allRows.reduce((s, r) => s + (r.members_count || 0), 0)))}
          </div>
          <EventTable rows={allRows} />
        </div>
      )}
    </div>
  );
};

export default EventReports;
