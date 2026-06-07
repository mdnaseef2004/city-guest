import React, { useState, useEffect } from 'react';
import { User, MapPin, Target, IndianRupee, Phone, MessageSquare, Clock, UserCircle, Car, Map, Plus, Trash2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { addGuest, checkDuplicateGuest, getUniquePlaces, getUniquePurposes, uploadGuestPDF } from '../lib/supabaseDB';
import { generateGuestVisitPDF } from '../lib/pdfGenerator';

const EMPTY_VISIT = { visited_place: '', visit_date: '', time_in: '', time_out: '' };
const EMPTY = { 
  guest_name: '', mobile_number: '', place: '', purpose: '', donation_amount: '', 
  picked_from: '', picked_time: '', handled_by: '', visits: [], guest_returned: '', return_date: '', return_time: '', remarks: '' 
};

const AddGuest = () => {
  const { profile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [places, setPlaces] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [dupModal, setDupModal] = useState(false);

  useEffect(() => {
    getUniquePlaces().then(setPlaces);
    getUniquePurposes().then(setPurposes);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleVisitChange = (index, field, value) => {
    const newVisits = [...form.visits];
    newVisits[index][field] = value;
    setForm(f => ({ ...f, visits: newVisits }));
  };

  const addVisit = () => setForm(f => ({ ...f, visits: [...f.visits, { ...EMPTY_VISIT }] }));
  const removeVisit = (index) => setForm(f => ({ ...f, visits: f.visits.filter((_, i) => i !== index) }));

  const doSubmit = async () => {
    setLoading(true);
    try {
      const savedVisit = await addGuest({
        guest_name: form.guest_name.trim(),
        phone_number: form.mobile_number.trim(), // API expects phone_number now
        place: form.place.trim(),
        purpose: form.purpose.trim(),
        donation_amount: form.donation_amount,
        picked_from: form.picked_from.trim(),
        picked_time: form.picked_time,
        handled_by: form.handled_by.trim(),
        visits: form.visits,
        guest_returned: form.guest_returned,
        return_date: form.return_date,
        return_time: form.return_time,
        remarks: form.remarks.trim(),
      });
      
      // Generate and upload PDF
      toast.loading('Generating PDF report...', { id: 'pdf-gen' });
      const pdfBlob = await generateGuestVisitPDF({ ...form });
      await uploadGuestPDF(savedVisit.id, pdfBlob);
      toast.success('PDF report generated and saved!', { id: 'pdf-gen' });

      toast.success('Guest entry saved successfully!');
      setForm(EMPTY);
      const [p, pu] = await Promise.all([getUniquePlaces(), getUniquePurposes()]);
      setPlaces(p);
      setPurposes(pu);
    } catch (err) {
      toast.dismiss('pdf-gen');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guest_name.trim() || !form.mobile_number.trim() || !form.place.trim() || !form.purpose.trim() || !form.guest_returned) {
      toast.error('Please fill in all required fields');
      return;
    }
    const isDup = await checkDuplicateGuest(form.guest_name);
    if (isDup) { setDupModal(true); return; }
    await doSubmit();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Add New Guest</h1>
        <p className="page-subtitle">Record a new guest visit</p>
      </div>

      <div className="card mb-4">
        <div className="card-body" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} className="text-muted" />
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>
              {now.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCircle size={16} className="text-muted" />
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>Entered by: <strong>{profile?.name}</strong></span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--primary)' }}>Guest Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="guest_name">Guest Name <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><User size={16} /></span>
                  <input id="guest_name" type="text" className="form-input" placeholder="Full name of guest"
                    value={form.guest_name} onChange={set('guest_name')} required disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobile">Phone Number <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><Phone size={16} /></span>
                  <input id="mobile" type="tel" className="form-input" placeholder="Phone number"
                    value={form.mobile_number} onChange={set('mobile_number')} required disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="place">Address <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><MapPin size={16} /></span>
                  <input id="place" type="text" className="form-input" placeholder="Full address"
                    value={form.place} onChange={set('place')} list="places-list" required disabled={loading} />
                  <datalist id="places-list">{places.map(p => <option key={p} value={p} />)}</datalist>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="purpose">Purpose of Visit <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><Target size={16} /></span>
                  <input id="purpose" type="text" className="form-input" placeholder="e.g., Blessing, Donation"
                    value={form.purpose} onChange={set('purpose')} list="purposes-list" required disabled={loading} />
                  <datalist id="purposes-list">{purposes.map(p => <option key={p} value={p} />)}</datalist>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="donation">Donation Amount (₹)</label>
                <div className="input-wrap">
                  <span className="input-icon"><IndianRupee size={16} /></span>
                  <input id="donation" type="number" className="form-input" placeholder="0" min="0" step="1"
                    value={form.donation_amount} onChange={set('donation_amount')} disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="picked_from">Picked From</label>
                <div className="input-wrap">
                  <span className="input-icon"><Car size={16} /></span>
                  <input id="picked_from" type="text" className="form-input" placeholder="Pickup location"
                    value={form.picked_from} onChange={set('picked_from')} disabled={loading} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="picked_time">Picked Time</label>
                <input id="picked_time" type="time" className="form-input no-icon"
                  value={form.picked_time} onChange={set('picked_time')} disabled={loading} />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="handled_by">Handled By</label>
                <div className="input-wrap">
                  <span className="input-icon"><Briefcase size={16} /></span>
                  <input id="handled_by" type="text" className="form-input" placeholder="Name of handler"
                    value={form.handled_by} onChange={set('handled_by')} disabled={loading} />
                </div>
              </div>
            </div>

            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>Multiple Visit Section</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addVisit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} /> Add Visited Place
              </button>
            </div>

            {form.visits.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface)', border: '1.5px dashed var(--border)', borderRadius: '12px', marginBottom: '24px' }}>
                <p className="text-muted" style={{ margin: 0 }}>No visits added. Click "Add Visited Place" to add a location.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {form.visits.map((visit, index) => (
                  <div key={index} className="visit-row">
                    <div>
                      <label className="form-label">Visited Place</label>
                      <div className="input-wrap">
                        <span className="input-icon"><Map size={16} /></span>
                        <input type="text" className="form-input" placeholder="Place name"
                          value={visit.visited_place} onChange={e => handleVisitChange(index, 'visited_place', e.target.value)} disabled={loading} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Date</label>
                      <input type="date" className="form-input no-icon"
                        value={visit.visit_date} onChange={e => handleVisitChange(index, 'visit_date', e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <label className="form-label">Time In</label>
                      <input type="time" className="form-input no-icon"
                        value={visit.time_in} onChange={e => handleVisitChange(index, 'time_in', e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <label className="form-label">Time Out</label>
                      <input type="time" className="form-input no-icon"
                        value={visit.time_out} onChange={e => handleVisitChange(index, 'time_out', e.target.value)} disabled={loading} />
                    </div>
                    <div className="visit-actions">
                      <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeVisit(index)} disabled={loading} style={{ color: 'var(--danger)' }} title="Remove Visit">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--primary)' }}>Additional Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="guest_returned">Guest Returned <span className="required">*</span></label>
                <select id="guest_returned" className="form-input no-icon" value={form.guest_returned} onChange={set('guest_returned')} required disabled={loading} style={{ cursor: 'pointer' }}>
                  <option value="">Select option...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="return_date">Return Date</label>
                <input id="return_date" type="date" className="form-input no-icon"
                  value={form.return_date} onChange={set('return_date')} disabled={loading} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="return_time">Return Time</label>
                <input id="return_time" type="time" className="form-input no-icon"
                  value={form.return_time} onChange={set('return_time')} disabled={loading} />
              </div>

              <div className="form-group form-group-full">
                <label className="form-label" htmlFor="remarks">Remarks</label>
                <div className="input-wrap">
                  <span className="input-icon" style={{ top: '12px', alignItems: 'flex-start' }}><MessageSquare size={16} /></span>
                  <textarea id="remarks" className="form-input" placeholder="Any additional notes..." rows={3}
                    value={form.remarks} onChange={set('remarks')} disabled={loading}
                    style={{ paddingLeft: '40px', resize: 'vertical' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setForm(EMPTY)} disabled={loading}>Clear</button>
              <button type="submit" className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Modal
        isOpen={dupModal} onClose={() => setDupModal(false)}
        title="Duplicate Entry Detected"
        confirmText="Add Anyway" confirmVariant="warning"
        onConfirm={() => { setDupModal(false); doSubmit(); }}
      >
        <p>A guest named <strong>"{form.guest_name}"</strong> was already recorded today by you.</p>
        <p style={{ marginTop: 8 }}>Do you want to add another entry for the same guest?</p>
      </Modal>
    </div>
  );
};

export default AddGuest;
