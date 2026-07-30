import React, { useState, useEffect } from 'react';
import { User, MapPin, Target, Wallet, Phone, MessageCircle, Clock, Image, Car, Compass, Plus, Trash, Briefcase, Camera, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { addGuest, checkDuplicateGuest, getUniquePurposes, getUsers, uploadGuestPDF, uploadGuestPhoto } from '../lib/supabaseDB';
import { generateGuestVisitPDF } from '../lib/pdfGenerator';
import { DISTRICTS_BY_STATE } from '../lib/districtsByState';
import ImageCropper from '../components/ImageCropper';



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

const EMPTY_VISIT = { visited_place: '', visit_date: '', time_in: '', time_out: '' };
const EMPTY = { 
  guest_name: '', mobile_number: '', occupation: '', place: '', district: '', state: '', country: '', is_international: false, purpose: '', donation_amount: '', receipt_no: '',
  picked_from: '', picked_date: '', picked_time: '', handled_by: '', visits: [], guest_returned: '', return_date: '', return_time: '', remarks: '' 
};

const AddGuest = () => {
  const { profile } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [purposes, setPurposes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [dupModal, setDupModal] = useState(false);

  useEffect(() => {
    getUniquePurposes().then(setPurposes);
    if (profile?.role === 'super_admin') {
      getUsers().then(setAllUsers);
    }
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [profile]);

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
      let photo_url = null;
      if (photoFile) {
        toast.loading('Uploading guest photo...', { id: 'photo-up' });
        photo_url = await uploadGuestPhoto(photoFile);
        toast.success('Photo uploaded!', { id: 'photo-up' });
      }

      const savedVisit = await addGuest({
        guest_name: form.guest_name.trim(),
        phone_number: form.mobile_number.trim(), // API expects phone_number now
        occupation: form.occupation.trim() || null,
        photo_url: photo_url,
        place: form.place.trim(),
        district: form.district.trim(),
        state: form.is_international ? null : form.state,
        country: form.is_international ? form.country : null,
        is_international: form.is_international,
        purpose: form.purpose.trim(),
        donation_amount: form.donation_amount,
        receipt_no: form.receipt_no ? form.receipt_no.trim() : null,
        picked_from: form.picked_from.trim(),
        picked_date: form.picked_date || null,
        picked_time: form.picked_time,
        handled_by: profile?.role === 'super_admin' ? form.handled_by.trim() : (profile?.name || ''),
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
      setPhotoFile(null);
      setPhotoPreview(null);
      const pu = await getUniquePurposes();
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
    const locationValid = form.is_international ? !!form.country : !!form.state;
    const districtValid = form.is_international || !!form.district.trim();
    const phoneValid = form.is_international || !!form.mobile_number.trim();
    const handledByVal = profile?.role === 'super_admin' ? form.handled_by.trim() : (profile?.name || '');
    if (!form.guest_name.trim() || !phoneValid || !form.place.trim() || !districtValid || !locationValid || !form.purpose.trim() || !handledByVal) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (Number(form.donation_amount) > 0 && !form.receipt_no?.trim()) {
      toast.error('Please enter the Receipt No for the donation');
      return;
    }
    const isDup = await checkDuplicateGuest(form.guest_name);
    if (isDup) { setDupModal(true); return; }
    await doSubmit();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Photo must be less than 20MB');
        return;
      }
      setCropImageSrc(URL.createObjectURL(file));
    }
    // Clear the input value so the same file can be selected again if needed
    e.target.value = '';
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
            <User size={16} className="text-muted" />
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>Entered by: <strong>{profile?.name}</strong></span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--primary)' }}>Guest Details</h3>
            
            {/* Guest Photo Upload */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
                background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed var(--border)', flexShrink: 0
              }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} color="var(--text-muted)" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Guest Photo (Optional)</label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                  <Camera size={16} /> Choose Photo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} disabled={loading} />
                </label>
                {photoFile && (
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="btn btn-ghost btn-sm" style={{ marginLeft: '12px', color: 'var(--danger)' }} disabled={loading}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="form-grid">
              {/* 1. Guest Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="guest_name">Guest Name <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><User size={16} /></span>
                  <input id="guest_name" type="text" className="form-input" placeholder="Full name of guest"
                    value={form.guest_name} onChange={set('guest_name')} required disabled={loading} />
                </div>
              </div>

              {/* 2. Phone Number */}
              <div className="form-group">
                <label className="form-label" htmlFor="mobile">Phone Number {!form.is_international && <span className="required">*</span>}</label>
                <div className="input-wrap">
                  <span className="input-icon"><Phone size={16} /></span>
                  <input id="mobile" type="tel" className="form-input" placeholder="Phone number"
                    value={form.mobile_number} onChange={set('mobile_number')} required={!form.is_international} disabled={loading} />
                </div>
              </div>

              {/* 3. Occupation (optional) */}
              <div className="form-group">
                <label className="form-label" htmlFor="occupation">Occupation</label>
                <div className="input-wrap">
                  <span className="input-icon"><Briefcase size={16} /></span>
                  <input id="occupation" type="text" className="form-input" placeholder="e.g., Engineer, Teacher"
                    value={form.occupation} onChange={set('occupation')} disabled={loading} />
                </div>
              </div>

              {/* 4. Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="place">Address <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><MapPin size={16} /></span>
                  <input id="place" type="text" className="form-input" placeholder="Full address"
                    value={form.place} onChange={set('place')} required disabled={loading} />
                </div>
              </div>

              {/* International Guest Checkbox */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', padding: '10px 16px',
                  background: form.is_international ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)',
                  border: form.is_international ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  borderRadius: '10px', transition: 'all 0.2s'
                }}>
                  <input
                    type="checkbox"
                    checked={form.is_international}
                    onChange={e => setForm(f => ({ ...f, is_international: e.target.checked, state: '', country: '', district: '' }))}
                    disabled={loading}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>🌍 International Guest</span>
                  {form.is_international && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: 4 }}>Country required instead of State</span>
                  )}
                </label>
              </div>

              {/* 4. State (domestic) OR Country (international) */}
              {!form.is_international ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="state">State <span className="required">*</span></label>
                  <div className="input-wrap">
                    <span className="input-icon"><Compass size={16} /></span>
                    <select id="state" className="form-input" value={form.state}
                      onChange={e => setForm(f => ({ ...f, state: e.target.value, district: '' }))}
                      required disabled={loading}>
                      <option value="" disabled>Select State</option>
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="country">Country <span className="required">*</span></label>
                  <div className="input-wrap">
                    <span className="input-icon">🌍</span>
                    <select id="country" className="form-input" value={form.country} onChange={set('country')} required disabled={loading}>
                      <option value="" disabled>Select Country</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 5. District — dropdown for TN/KA, text input for others */}
              {!form.is_international && (
                <div className="form-group">
                  <label className="form-label" htmlFor="district">District <span className="required">*</span></label>
                  <div className="input-wrap">
                    <span className="input-icon"><Compass size={16} /></span>
                    {DISTRICTS_BY_STATE[form.state] ? (
                      <select id="district" className="form-input" value={form.district}
                        onChange={set('district')} required disabled={loading}>
                        <option value="" disabled>Select District</option>
                        {DISTRICTS_BY_STATE[form.state].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    ) : (
                      <input id="district" type="text" className="form-input" placeholder="District"
                        value={form.district} onChange={set('district')} required disabled={loading} />
                    )}
                  </div>
                </div>
              )}

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
                  <span className="input-icon"><Wallet size={16} /></span>
                  <input id="donation" type="number" className="form-input" placeholder="0" min="0" step="1"
                    value={form.donation_amount} onChange={set('donation_amount')} disabled={loading} />
                </div>
              </div>

              {Number(form.donation_amount) > 0 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="receipt_no">Receipt No <span className="required">*</span></label>
                  <div className="input-wrap">
                    <span className="input-icon"><FileText size={16} /></span>
                    <input id="receipt_no" type="text" className="form-input" placeholder="e.g. REC-12345"
                      value={form.receipt_no} onChange={set('receipt_no')} required disabled={loading} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="picked_date">Picked Date</label>
                <input id="picked_date" type="date" className="form-input no-icon"
                  value={form.picked_date} onChange={set('picked_date')} disabled={loading} />
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
                <label className="form-label" htmlFor="handled_by">Handled By <span className="required">*</span></label>
                <div className="input-wrap">
                  <span className="input-icon"><Briefcase size={16} /></span>
                  {profile?.role === 'super_admin' ? (
                    <select id="handled_by" className="form-input" value={form.handled_by}
                      onChange={set('handled_by')} required disabled={loading}>
                      <option value="">Select person...</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'})</option>
                      ))}
                    </select>
                  ) : (
                    <input id="handled_by" type="text" className="form-input"
                      value={profile?.name || ''}
                      readOnly disabled required />
                  )}
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
                        <span className="input-icon"><Compass size={16} /></span>
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
                        <Trash size={16} />
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
                <label className="form-label" htmlFor="guest_returned">Guest Returned</label>
                <select id="guest_returned" className="form-input no-icon" value={form.guest_returned} onChange={set('guest_returned')} disabled={loading} style={{ cursor: 'pointer' }}>
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
                  <span className="input-icon" style={{ top: '12px', alignItems: 'flex-start' }}><MessageCircle size={16} /></span>
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
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={(croppedFile, previewUrl) => {
            setPhotoFile(croppedFile);
            setPhotoPreview(previewUrl);
            setCropImageSrc(null);
          }}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
};

export default AddGuest;
