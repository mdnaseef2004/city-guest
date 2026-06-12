import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Pencil, Trash2, ChevronLeft, ChevronRight, Plus, Map, Download, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import DateRangePicker from '../components/DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getGuests, getUsers, getUniquePlaces, getUniquePurposes, updateGuest, deleteGuest } from '../lib/supabaseDB';

const PER_PAGE = 20;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
  "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const EMPTY_VISIT = { id: null, visited_place: '', visit_date: '', time_in: '', time_out: '' };
const EMPTY_FORM = { 
  id: null, guest_name: '', phone_number: '', place: '', state: '', country: '', is_international: false, purpose: '', 
  donation_amount: '', picked_from: '', picked_time: '', handled_by: '', remarks: '',
  guest_returned: '', return_date: '', return_time: '', visited_places: []
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

  useEffect(() => { 
    fetchRecords(); 
    
    // Real-time sync for Guest Records page
    const channel = supabase.channel('guest_records_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_visits' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [fetchRecords]);

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
      id: r.id, guest_name: r.guest_name || '', phone_number: r.phone_number || '',
      place: r.place || '', state: r.state || '', country: r.country || '',
      is_international: r.is_international || false,
      purpose: r.purpose || '', donation_amount: r.donation_amount || '',
      picked_from: r.picked_from || '', picked_time: r.picked_time || '',
      handled_by: r.handled_by || '', remarks: r.remarks || '',
      guest_returned: r.guest_returned || '', return_date: r.return_date || '', return_time: r.return_time || '',
      visited_places: r.visited_places?.length ? [...r.visited_places] : []
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
                  <th>Guest Name</th><th>Address</th><th>State / Country</th><th>Purpose</th>
                  <th>Donation</th><th>Phone</th><th>Returned</th><th>Date</th>
                  <th>Entered By</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.guest_name}</strong>
                      {r.is_international && (
                        <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', borderRadius: 6, padding: '1px 6px', fontWeight: 600 }}>🌍 INTL</span>
                      )}
                    </td>
                    <td>{r.place}</td>
                    <td>{r.is_international ? (r.country || '—') : (r.state || '—')}</td>
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
          <div className="form-group">
            <label className="form-label">Guest Name</label>
            <input type="text" className="form-input no-icon" value={editForm.guest_name}
              onChange={e => setEditForm(f => ({ ...f, guest_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input type="text" className="form-input no-icon" value={editForm.place}
              onChange={e => setEditForm(f => ({ ...f, place: e.target.value }))} />
          </div>

          {/* International toggle in edit modal */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 14px', background: editForm.is_international ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)', border: editForm.is_international ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', borderRadius: 10, transition: 'all 0.2s' }}>
              <input type="checkbox" checked={editForm.is_international}
                onChange={e => setEditForm(f => ({ ...f, is_international: e.target.checked, state: '', country: '' }))}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>🌍 International Guest</span>
            </label>
          </div>

          {!editForm.is_international ? (
            <div className="form-group">
              <label className="form-label">State</label>
              <select className="form-input no-icon" value={editForm.state}
                onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Country</label>
              <select className="form-input no-icon" value={editForm.country}
                onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}>
                <option value="">Select Country</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {[['purpose', 'Purpose', 'text'], ['donation_amount', 'Donation (₹)', 'number'], ['phone_number', 'Phone', 'tel'], ['picked_from', 'Picked From', 'text'], ['picked_time', 'Picked Time', 'time'], ['handled_by', 'Handled By', 'text']].map(([k, lbl, type]) => (
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
