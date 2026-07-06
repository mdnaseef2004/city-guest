import React, { useState, useEffect } from "react";
import { Building2, MapPin, Users, Briefcase, User, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { getUsers } from "../lib/supabaseDB";

const EMPTY = { event_name: "", event_place: "", members_count: "", organized_by: "", event_date: "", handled_by: "", remarks: "" };

const AddEvent = () => {
  const { profile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => { if (profile?.role === "super_admin") getUsers().then(setUsers); }, [profile]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.event_name.trim()) { toast.error("Event Name is required"); return; }
    if (!form.event_place.trim()) { toast.error("Event Place is required"); return; }
    if (!form.members_count || Number(form.members_count) < 1) { toast.error("Members Participated is required"); return; }
    if (!form.organized_by.trim()) { toast.error("Organized By is required"); return; }
    if (!form.event_date) { toast.error("Event Date is required"); return; }
    const handledBy = profile?.role === "super_admin" ? form.handled_by.trim() : (profile?.name || "");
    if (!handledBy) { toast.error("Handled By is required"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("events").insert({
        event_name: form.event_name.trim(), event_place: form.event_place.trim(),
        members_count: Number(form.members_count), organized_by: form.organized_by.trim(),
        event_date: form.event_date, handled_by: handledBy,
        remarks: form.remarks.trim() || null, created_by: profile.id,
      });
      if (error) throw error;
      toast.success("Event added successfully!");
      setForm(EMPTY);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Add Event</h1>
        <p className="page-subtitle">Record a new event with all details</p>
      </div>
      <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="card-body" style={{ padding: "28px 32px" }}>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <h4 style={{ gridColumn: "1 / -1", color: "var(--primary)", margin: 0, marginBottom: 4 }}>Event Details</h4>
              <div className="form-group form-group-full">
                <label className="form-label" htmlFor="event_name">Event Name <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><Building2 size={16} /></span>
                  <input id="event_name" type="text" className="form-input" placeholder="e.g. Annual Conference 2025"
                    value={form.event_name} onChange={set("event_name")} disabled={loading} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="event_place">Event Place <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><MapPin size={16} /></span>
                  <input id="event_place" type="text" className="form-input" placeholder="e.g. Main Auditorium"
                    value={form.event_place} onChange={set("event_place")} disabled={loading} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="event_date">Event Date <span className="required">*</span></label>
                <input id="event_date" type="date" className="form-input no-icon"
                  value={form.event_date} onChange={set("event_date")} disabled={loading} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="members_count">Members Participated <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><Users size={16} /></span>
                  <input id="members_count" type="number" className="form-input" placeholder="e.g. 150"
                    min="1" value={form.members_count} onChange={set("members_count")} disabled={loading} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="organized_by">Organized By <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><Briefcase size={16} /></span>
                  <input id="organized_by" type="text" className="form-input" placeholder="e.g. Outreach Department"
                    value={form.organized_by} onChange={set("organized_by")} disabled={loading} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="handled_by">Handled By <span className="required">*</span></label>
                {profile?.role === "super_admin" ? (
                  <select id="handled_by" className="form-input no-icon" value={form.handled_by}
                    onChange={set("handled_by")} disabled={loading} required>
                    <option value="">Select person...</option>
                    {users.map((u) => (<option key={u.id} value={u.name}>{u.name} ({u.role === "super_admin" ? "Super Admin" : "Sub Admin"})</option>))}
                  </select>
                ) : (
                  <div className="input-wrap">
                    <span className="input-icon"><User size={16} /></span>
                    <input type="text" className="form-input" value={profile?.name || ""} readOnly disabled />
                  </div>
                )}
              </div>
              <div className="form-group form-group-full">
                <label className="form-label" htmlFor="remarks">Remarks</label>
                <div className="input-wrap" style={{ alignItems: "flex-start" }}>
                  <span className="input-icon" style={{ paddingTop: 10 }}><MessageSquare size={16} /></span>
                  <textarea id="remarks" className="form-input" rows={3} placeholder="Any additional notes..."
                    value={form.remarks} onChange={set("remarks")} disabled={loading} style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setForm(EMPTY)} disabled={loading}>Clear</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Event"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEvent;
