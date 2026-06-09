import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Pencil, Trash2, ChevronLeft, ChevronRight, Plus, Map, Download, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DateRangePicker from '../components/DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { getGuests, getUsers, getUniquePlaces, getUniquePurposes, updateGuest, deleteGuest } from '../lib/supabaseDB';

const PER_PAGE = 20;
const EMPTY_VISIT = { visited_place: '', visit_date: '', time_in: '', time_out: '' };
const EMPTY_FORM = { 
  guest_name: '', place: '', purpose: '', donation_amount: '', phone_number: '', 
  picked_from: '', picked_time: '', handled_by: '', visited_places: [], guest_returned: '', return_date: '', return_time: '', remarks: '' 
};

const GuestRecords = () => {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [placeFilter, setPlaceFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');

  const [places, setPlaces] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [users, setUsers] = useState([]);

  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, total } = await getGuests({
        search,
        startDate: startDate ? startDate + 'T00:00:00.000Z' : '',
        endDate: endDate ? endDate + 'T23:59:59.999Z' : '',
        place: placeFilter, purpose: purposeFilter,
        createdBy: adminFilter, page, perPage: PER_PAGE,
      });
      setRecords(data);
      setTotal(total);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, placeFilter, purposeFilter, adminFilter, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    getUniquePlaces().then(setPlaces);
    getUniquePurposes().then(setPurposes);
    if (profile?.role === 'super_admin') getUsers().then(setUsers);
  }, [profile]);

  const clearFilters = () => {
    setSearch(''); setStartDate(''); setEndDate('');
    setPlaceFilter(''); setPurposeFilter(''); setAdminFilter(''); setPage(1);
  };

  const openEdit = (r) => {
    setSelected(r);
    setEditForm({ 
      guest_name: r.guest_name, place: r.place, purpose: r.purpose, 
      donation_amount: r.donation_amount, phone_number: r.phone_number || '', 
      picked_from: r.picked_from || '', picked_time: r.picked_time || '', handled_by: r.handled_by || '',
      visited_places: (r.visited_places || []).map(v => ({ visited_place: v.visited_place, visit_date: v.visit_date || '', time_in: v.time_in, time_out: v.time_out })), 
      guest_returned: r.guest_returned || '', return_date: r.return_date || '', return_time: r.return_time || '',
      remarks: r.remarks || '' 
    });
    setEditModal(true);
  };
  const openDelete = (r) => { setSelected(r); setDeleteModal(true); };

  const handleVisitChange = (index, field, value) => {
    const newVisits = [...editForm.visited_places];
    newVisits[index][field] = value;
    setEditForm(f => ({ ...f, visited_places: newVisits }));
  };

  const addVisit = () => setEditForm(f => ({ ...f, visited_places: [...f.visited_places, { ...EMPTY_VISIT }] }));
  const removeVisit = (index) => setEditForm(f => ({ ...f, visited_places: f.visited_places.filter((_, i) => i !== index) }));

  const handleEdit = async () => {
    try {
      const { visited_places, donation_amount, ...updates } = editForm;
      updates.donation_amount = Number(donation_amount) || 0;
      await updateGuest(selected.id, updates, visited_places);
      toast.success('Guest updated successfully');
      setEditModal(false);
      fetchRecords();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    try {
      await deleteGuest(selected.id);
      toast.success('Guest deleted');
      setDeleteModal(false);
      fetchRecords();
    } catch (e) { toast.error(e.message); }
  };

  const handleThankYou = (guest) => {
    if (!guest.phone_number) {
      toast.error('No phone number available for this guest.');
      return;
    }
    const message = `Hi ${guest.guest_name},

Thank you for visiting Markaz Knowledge City.

We truly appreciate your time and interest in our vision and initiatives. It was a pleasure hosting you and we look forward to your continued support and cooperation.

If there were any shortcomings or inconveniences during your visit, we kindly seek your understanding and forgiveness.

For any future communication or assistance, please feel free to contact us at +91 62359 98805.

Warm regards,

Guest Relations/ Outreach Department
Markaz Knowledge City`;
    const phone = guest.phone_number.replace(/\D/g, '');
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_self');
  };

  const canEdit = (r) => profile?.role === 'super_admin' || r.created_by === profile?.id;
  const canDelete = () => profile?.role === 'super_admin';
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Guest Records</h1>
        <p className="page-subtitle">{total} record{total !== 1 ? 's' : ''} found</p>
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <div className="input-wrap" style={{ flex: '1 1 250px' }}>
                <span className="input-icon"><Search size={16} /></span>
                <input type="text" className="form-input" placeholder="Search guests by name..."
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{ borderRadius: '12px' }} />
              </div>
              <select className="form-input no-icon text-center" value={placeFilter} onChange={e => { setPlaceFilter(e.target.value); setPage(1); }} style={{ width: 'auto', flex: '1 1 150px', borderRadius: '12px', cursor: 'pointer' }}>
                <option value="">All Addresses</option>
                {places.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="form-input no-icon text-center" value={purposeFilter} onChange={e => { setPurposeFilter(e.target.value); setPage(1); }} style={{ width: 'auto', flex: '1 1 150px', borderRadius: '12px', cursor: 'pointer' }}>
                <option value="">All Purposes</option>
                {purposes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {profile?.role === 'super_admin' && (
                <select className="form-input no-icon text-center" value={adminFilter} onChange={e => { setAdminFilter(e.target.value); setPage(1); }} style={{ width: 'auto', flex: '1 1 150px', borderRadius: '12px', cursor: 'pointer' }}>
                  <option value="">All Admins</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <DateRangePicker startDate={startDate} endDate={endDate}
                onStartDateChange={v => { setStartDate(v); setPage(1); }}
                onEndDateChange={v => { setEndDate(v); setPage(1); }} />
              {(search || startDate || endDate || placeFilter || purposeFilter || adminFilter) && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', marginTop: '2px' }}>
                  <X size={14} /> Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner"></div></div>
          ) : records.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px' }}>
              <p>No records found. Try adjusting your filters.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Guest Name</th><th>Address</th><th>Purpose</th>
                  <th>Donation</th><th>Phone</th><th>Returned</th><th>Date</th>
                  <th>Entered By</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.guest_name}</strong></td>
                    <td>{r.place}</td>
                    <td>{r.purpose}</td>
                    <td>₹{Number(r.donation_amount || 0).toLocaleString('en-IN')}</td>
                    <td>{r.phone_number || '—'}</td>
                    <td>{r.guest_returned || '—'}</td>
                    <td>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                    <td>{r.profiles?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {r.pdf_url && (
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon" title="Download PDF">
                            <Download size={14} />
                          </a>
                        )}
                        <button className="btn btn-primary btn-sm" title="Send Thank You SMS" onClick={() => handleThankYou(r)} style={{ padding: '4px 8px', fontSize: 12 }}>
                          <MessageSquare size={12} /> Thank You
                        </button>
                        {canEdit(r) && (
                          <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(r)}>
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete() && (
                          <button className="btn btn-ghost btn-icon" title="Delete" onClick={() => openDelete(r)}
                            style={{ color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                <ChevronLeft size={14} />
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Guest Entry"
        confirmText="Save Changes" onConfirm={handleEdit}>
        <div className="form-grid" style={{ gap: '12px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
          
          <h4 style={{ gridColumn: '1 / -1', color: 'var(--primary)', margin: 0, marginTop: '8px' }}>Basic Details</h4>
          {[['guest_name', 'Guest Name', 'text'], ['place', 'Address', 'text'], ['purpose', 'Purpose', 'text'], ['donation_amount', 'Donation (₹)', 'number'], ['phone_number', 'Phone', 'tel'], ['picked_from', 'Picked From', 'text'], ['picked_time', 'Picked Time', 'time'], ['handled_by', 'Handled By', 'text']].map(([k, lbl, type]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{lbl}</label>
              <input type={type} className="form-input no-icon" value={editForm[k]}
                onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} min={type === 'number' ? 0 : undefined} />
            </div>
          ))}
          
          <h4 style={{ gridColumn: '1 / -1', color: 'var(--primary)', margin: 0, marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Visited Places
            <button type="button" className="btn btn-secondary btn-sm" onClick={addVisit} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <Plus size={12} /> Add
            </button>
          </h4>
          
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {editForm.visited_places.map((visit, index) => (
              <div key={index} className="visit-row">
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Place</label>
                  <input type="text" className="form-input no-icon" value={visit.visited_place} onChange={e => handleVisitChange(index, 'visited_place', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Date</label>
                  <input type="date" className="form-input no-icon" value={visit.visit_date} onChange={e => handleVisitChange(index, 'visit_date', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Time In</label>
                  <input type="time" className="form-input no-icon" value={visit.time_in} onChange={e => handleVisitChange(index, 'time_in', e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Time Out</label>
                  <input type="time" className="form-input no-icon" value={visit.time_out} onChange={e => handleVisitChange(index, 'time_out', e.target.value)} />
                </div>
                <div className="visit-actions">
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeVisit(index)} style={{ color: 'var(--danger)', padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {editForm.visited_places.length === 0 && (
              <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>No visits recorded.</p>
            )}
          </div>

          <h4 style={{ gridColumn: '1 / -1', color: 'var(--primary)', margin: 0, marginTop: '16px' }}>Return & Remarks</h4>
          
          <div className="form-group">
            <label className="form-label">Guest Returned</label>
            <select className="form-input no-icon" value={editForm.guest_returned} onChange={e => setEditForm(f => ({ ...f, guest_returned: e.target.value }))}>
              <option value="">Select...</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Return Date</label>
            <input type="date" className="form-input no-icon" value={editForm.return_date} onChange={e => setEditForm(f => ({ ...f, return_date: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Return Time</label>
            <input type="time" className="form-input no-icon" value={editForm.return_time} onChange={e => setEditForm(f => ({ ...f, return_time: e.target.value }))} />
          </div>

          <div className="form-group form-group-full">
            <label className="form-label">Remarks</label>
            <textarea className="form-input no-icon" rows={2} value={editForm.remarks}
              onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Guest Entry"
        confirmText="Delete" confirmVariant="danger" onConfirm={handleDelete}>
        <p>Are you sure you want to delete the entry for <strong>{selected?.guest_name}</strong>? This cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default GuestRecords;
