import React, { useState, useEffect } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DateRangePicker from "../components/DateRangePicker";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/dateUtils";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

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

const EventReports = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState("daily");
  const [loading, setLoading] = useState(false);

  const [dailyDate, setDailyDate] = useState(today());
  const [dailyRows, setDailyRows] = useState([]);

  const [monthVal, setMonthVal] = useState(thisMonth());
  const [monthRows, setMonthRows] = useState([]);

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customRows, setCustomRows] = useState([]);

  const [allRows, setAllRows] = useState([]);

  const load = (setter, params) => {
    setLoading(true);
    fetchEvents(params).then(setter).catch((e) => { console.error(e); }).finally(() => setLoading(false));
  };

  useEffect(() => { if (tab === "daily") load(setDailyRows, { startDate: dailyDate, endDate: dailyDate }); }, [tab, dailyDate]);
  useEffect(() => {
    if (tab !== "monthly") return;
    const [yyyy, mm] = monthVal.split("-");
    const lastDay = new Date(yyyy, mm, 0).getDate();
    load(setMonthRows, { startDate: `${monthVal}-01`, endDate: `${monthVal}-${lastDay}` });
  }, [tab, monthVal]);
  useEffect(() => { if (tab === "custom") load(setCustomRows, { startDate: customStart, endDate: customEnd }); }, [tab, customStart, customEnd]);
  useEffect(() => { if (tab === "all") load(setAllRows, {}); }, [tab]);

  const tabs = [
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
        <p className="page-subtitle">View and export event records</p>
      </div>

      <div className="tabs mb-4">
        {tabs.map((t) => <button key={t.id} className={`tab ${tab === t.id ? "tab-active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {loading && <div className="loading-screen"><div className="spinner"></div></div>}

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
