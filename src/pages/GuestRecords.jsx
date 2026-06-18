import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Pencil, Trash2, ChevronLeft, ChevronRight, Plus, Map, Download, MessageSquare, FileSpreadsheet, FileText, Camera, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import ImageCropper from '../components/ImageCropper';
import DateRangePicker from '../components/DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getGuests, getUsers, getUniquePlaces, getUniqueDistricts, getUniquePurposes, getUniqueHandledBy, updateGuest, deleteGuest, uploadGuestPhoto } from '../lib/supabaseDB';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../utils/dateUtils';
import { DISTRICTS_BY_STATE } from '../lib/districtsByState';

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => resolve(img);
  img.onerror = (e) => reject(e);
  img.src = url;
});

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
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)",
  "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini (fmr. Swaziland)", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau",
  "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia",
  "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
  "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const EMPTY_VISIT = { id: null, visited_place: '', visit_date: '', time_in: '', time_out: '' };
const EMPTY_FORM = { 
  id: null, guest_name: '', phone_number: '', occupation: '', photo_url: '', place: '', state: '', country: '', is_international: false, purpose: '', 
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
  const [districtFilter, setDistrictFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const [places, setPlaces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [users, setUsers] = useState([]);

  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [handledByFilter, setHandledByFilter] = useState('');
  const [handledByList, setHandledByList] = useState([]);

  const fetchRecordsRef = useRef(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, total } = await getGuests({
        search,
        startDate: startDate ? startDate + 'T00:00:00.000Z' : '',
        endDate: endDate ? endDate + 'T23:59:59.999Z' : '',
        place: placeFilter, districtFilter, purpose: purposeFilter,
        createdBy: adminFilter, handledBy: handledByFilter, stateFilter, countryFilter, page, perPage: PER_PAGE,
      });
      setRecords(data);
      setTotal(total);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, placeFilter, districtFilter, purposeFilter, adminFilter, handledByFilter, stateFilter, countryFilter, page]);

  // Keep ref always pointing to latest fetchRecords
  useEffect(() => { fetchRecordsRef.current = fetchRecords; }, [fetchRecords]);

  // Fetch on filter/page changes
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Real-time sync — created ONCE on mount, uses ref to stay current
  useEffect(() => {
    const channelName = `guest_records_${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_visits' }, () => {
        fetchRecordsRef.current?.();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getUniquePlaces().then(setPlaces);
    getUniqueDistricts().then(setDistricts);
    getUniquePurposes().then(setPurposes);
    getUniqueHandledBy().then(setHandledByList);
    if (profile?.role === 'super_admin') getUsers().then(setUsers);
  }, [profile]);

  const clearFilters = () => {
    setSearch(''); setStartDate(''); setEndDate('');
    setPlaceFilter(''); setDistrictFilter(''); setPurposeFilter(''); setAdminFilter('');
    setHandledByFilter('');
    setStateFilter(''); setCountryFilter(''); setPage(1);
  };

  const handleExport = async (format) => {
    const t = toast.loading(`Preparing ${format.toUpperCase()}...`);
    try {
      // Fetch all matching without pagination
      const { data } = await getGuests({
        search,
        startDate: startDate ? startDate + 'T00:00:00.000Z' : '',
        endDate: endDate ? endDate + 'T23:59:59.999Z' : '',
        place: placeFilter, districtFilter, purpose: purposeFilter,
        createdBy: adminFilter, handledBy: handledByFilter, stateFilter, countryFilter, page: 1, perPage: 100000,
      });

      if (!data.length) {
        toast.error('No records to export', { id: t });
        return;
      }

      const rows = data.map(r => ({
        'Guest Name': r.guest_name,
        'Occupation': r.occupation || '',
        'Address': r.place,
        'District': r.district || '',
        'State': r.state || '',
        'Country': r.country || '',
        'Phone Number': r.phone_number || '',
        'Purpose': r.purpose,
        'Donation (₹)': r.donation_amount || 0,
        'Picked Date': r.picked_date || '',
        'Picked From': r.picked_from || '',
        'Picked Time': r.picked_time || '',
        'Returned': r.guest_returned,
        'Return Date': r.return_date || '',
        'Return Time': r.return_time || '',
        'Remarks': r.remarks || '',
        'Entered By': r.profiles?.name || 'Unknown',
        'Date Entered': new Date(r.created_at).toLocaleString('en-IN')
      }));

      let baseTitle = "All Guest Report";
      if (adminFilter) {
        const selectedAdminName = users.find(u => u.id === adminFilter)?.name;
        if (selectedAdminName) {
          baseTitle = `Report of ${selectedAdminName}`;
        }
      }

      let reportTitle = baseTitle;
      
      if (startDate && endDate) {
        const sd = new Date(startDate);
        const ed = new Date(endDate);
        const isFullMonth = sd.getMonth() === ed.getMonth() && sd.getFullYear() === ed.getFullYear() && sd.getDate() === 1 && new Date(ed.getFullYear(), ed.getMonth() + 1, 0).getDate() === ed.getDate();
        
        if (isFullMonth) {
          reportTitle = `${sd.toLocaleString('en-US', { month: 'long', year: 'numeric' })} ${baseTitle}`;
        } else if (sd.getTime() === ed.getTime()) {
          reportTitle = `${baseTitle} for ${formatDate(startDate)}`;
        } else {
          reportTitle = `${baseTitle} (${formatDate(startDate)} to ${formatDate(endDate)})`;
        }
      } else if (startDate) {
        reportTitle = `${baseTitle} (From ${formatDate(startDate)})`;
      } else if (endDate) {
        reportTitle = `${baseTitle} (Until ${formatDate(endDate)})`;
      }

      const locations = [stateFilter, countryFilter, districtFilter, placeFilter].filter(Boolean);
      if (locations.length > 0) {
        reportTitle += ` - ${locations.join(', ')}`;
      }

      const filename = `${reportTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'pdf') {
        const doc = new jsPDF('l', 'pt', 'a4'); // Landscape for many columns
        
        // Try to load logo
        let logoImg = null;
        try {
          logoImg = await loadImage('/IMG_2458.PNG');
        } catch (e) {
          console.warn("Could not load logo", e);
        }

        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const MARGIN = 40;
        
        // Define header draw function for every page
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
          doc.text(reportTitle.toUpperCase(), PAGE_WIDTH / 2, titleY, { align: 'center' });
          
          // Divider
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(1);
          doc.line(MARGIN, titleY + 15, PAGE_WIDTH - MARGIN, titleY + 15);
        };

        const keys = Object.keys(rows[0]);
        const bodyData = rows.map(r => keys.map(k => String(r[k] ?? '')));

        autoTable(doc, {
          startY: 140, // Leave space for header
          head: [keys],
          body: bodyData,
          margin: { top: 140, left: MARGIN, right: MARGIN },
          theme: 'grid',
          headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 8 }, // Emerald theme
          bodyStyles: { fontSize: 8 },
          didDrawPage: drawHeader
        });

        doc.save(`${filename}.pdf`);
      } else if (format === 'csv') {
        const keys = Object.keys(rows[0]);
        const csv = [keys.join(','), ...rows.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `${filename}.csv`;
        a.click();
      } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Records');
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }
      toast.success('Export complete', { id: t });
    } catch (e) {
      toast.error('Export failed: ' + e.message, { id: t });
    }
  };

  const openEdit = (r) => {
    setSelected(r);
    setEditPhotoFile(null);
    setEditPhotoPreview(r.photo_url || null);
    setEditForm({
      id: r.id, guest_name: r.guest_name || '', phone_number: r.phone_number || '',
      occupation: r.occupation || '', photo_url: r.photo_url || '',
      place: r.place || '', district: r.district || '', state: r.state || '', country: r.country || '',
      is_international: r.is_international || false,
      purpose: r.purpose || '', donation_amount: r.donation_amount || '',
      picked_date: r.picked_date || '', picked_from: r.picked_from || '', picked_time: r.picked_time || '',
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
    const handledByVal = profile?.role === 'super_admin' ? editForm.handled_by.trim() : (profile?.name || '');
    if (!handledByVal) {
      toast.error('Handled By is required');
      return;
    }
    if (!editForm.is_international && !editForm.phone_number.trim()) {
      toast.error('Phone number is required for domestic guests');
      return;
    }
    try {
      let finalPhotoUrl = editForm.photo_url;
      if (editPhotoFile) {
        toast.loading('Uploading new photo...', { id: 'photo-up' });
        finalPhotoUrl = await uploadGuestPhoto(editPhotoFile);
        toast.success('Photo updated!', { id: 'photo-up' });
      } else if (!editPhotoPreview) {
        finalPhotoUrl = null; // User removed the photo
      }

      const { visited_places, donation_amount, ...updates } = editForm;
      updates.donation_amount = Number(donation_amount) || 0;
      updates.photo_url = finalPhotoUrl;
      updates.handled_by = profile?.role === 'super_admin' ? editForm.handled_by.trim() : (profile?.name || '');
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

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 className="page-title">Guest Records</h1>
          <p className="page-subtitle">{total} record{total !== 1 ? 's' : ''} found</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('pdf')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={15} /> PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('excel')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card mb-4" style={{ overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row 1 — Search + dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {/* Search */}
            <div className="input-wrap" style={{ flex: '2 1 220px', minWidth: 180 }}>
              <span className="input-icon"><Search size={15} /></span>
              <input type="text" className="form-input" placeholder="Search guests by name..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ borderRadius: 10 }} />
            </div>

            {/* Address */}
            <select className="form-input no-icon" value={placeFilter}
              onChange={e => { setPlaceFilter(e.target.value); setPage(1); }}
              style={{ flex: '1 1 140px', minWidth: 120, borderRadius: 10, cursor: 'pointer' }}>
              <option value="">All Addresses</option>
              {places.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* District */}
            <select className="form-input no-icon" value={districtFilter}
              onChange={e => { setDistrictFilter(e.target.value); setPage(1); }}
              style={{ flex: '1 1 140px', minWidth: 120, borderRadius: 10, cursor: 'pointer' }}>
              <option value="">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* State */}
            <select className="form-input no-icon" value={stateFilter}
              onChange={e => { setStateFilter(e.target.value); setPage(1); }}
              style={{ flex: '1 1 130px', minWidth: 110, borderRadius: 10, cursor: 'pointer' }}>
              <option value="">All States</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Country */}
            <select className="form-input no-icon" value={countryFilter}
              onChange={e => { setCountryFilter(e.target.value); setPage(1); }}
              style={{ flex: '1 1 130px', minWidth: 110, borderRadius: 10, cursor: 'pointer' }}>
              <option value="">All Countries</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Purpose */}
            <select className="form-input no-icon" value={purposeFilter}
              onChange={e => { setPurposeFilter(e.target.value); setPage(1); }}
              style={{ flex: '1 1 140px', minWidth: 120, borderRadius: 10, cursor: 'pointer' }}>
              <option value="">All Purposes</option>
              {purposes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Handled By */}
            <select className="form-input no-icon" value={handledByFilter}
              onChange={e => { setHandledByFilter(e.target.value); setPage(1); }}
              style={{ flex: '1 1 140px', minWidth: 120, borderRadius: 10, cursor: 'pointer' }}>
              <option value="">All Handled By</option>
              {handledByList.map(h => <option key={h} value={h}>{h}</option>)}
            </select>

            {/* Admins — super admin only */}
            {profile?.role === 'super_admin' && (
              <select className="form-input no-icon" value={adminFilter}
                onChange={e => { setAdminFilter(e.target.value); setPage(1); }}
                style={{ flex: '1 1 140px', minWidth: 120, borderRadius: 10, cursor: 'pointer' }}>
                <option value="">All Admins</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
          </div>

          {/* Row 2 — Date range + clear */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <DateRangePicker
              startDate={startDate} endDate={endDate}
              onStartDateChange={v => { setStartDate(v); setPage(1); }}
              onEndDateChange={v => { setEndDate(v); setPage(1); }} />
            {(search || startDate || endDate || placeFilter || districtFilter || purposeFilter || adminFilter || stateFilter || countryFilter || handledByFilter) && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)' }}>
                <X size={14} /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <p>No records found. Try adjusting your filters.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Occupation</th>
                  <th>Address</th>
                  <th>District</th>
                  <th>State / Country</th>
                  <th>Purpose</th>
                  <th>Donation</th>
                  <th>Picked Date</th>
                  <th>Phone</th>
                  <th>Returned</th>
                  <th>Date</th>
                  <th>Handled By</th>
                  <th>Entered By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.photo_url ? <img src={r.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={20} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <strong>{r.guest_name}</strong>
                          {r.is_international && (
                            <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', borderRadius: 6, padding: '1px 6px', fontWeight: 600 }}>
                              🌍 INTL
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{r.occupation || '—'}</td>
                    <td>{r.place}</td>
                    <td>{r.district}</td>
                    <td>{r.is_international ? (r.country || '—') : (r.state || '—')}</td>
                    <td>{r.purpose}</td>
                    <td>₹{Number(r.donation_amount || 0).toLocaleString('en-IN')}</td>
                    <td>{r.picked_date ? formatDate(r.picked_date) : '—'}</td>
                    <td>{r.phone_number || '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: r.guest_returned === 'Yes' ? 'var(--success-light)' : 'var(--warning-light)',
                        color: r.guest_returned === 'Yes' ? 'var(--success)' : 'var(--warning)',
                      }}>
                        {r.guest_returned || '—'}
                      </span>
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>{r.handled_by || '—'}</td>
                    <td>{r.profiles?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                        {r.pdf_url && (
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost btn-icon" title="Download PDF">
                            <Download size={14} />
                          </a>
                        )}
                        <button className="btn btn-primary btn-sm" title="Send Thank You SMS"
                          onClick={() => handleThankYou(r)}
                          style={{ padding: '4px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          <MessageSquare size={12} /> Thank You
                        </button>
                        {canEdit(r) && (
                          <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(r)}>
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete() && (
                          <button className="btn btn-ghost btn-icon" title="Delete"
                            onClick={() => openDelete(r)} style={{ color: 'var(--danger)' }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
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

          {/* Guest Photo Upload */}
          <div style={{ gridColumn: '1 / -1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden',
              background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed var(--border)', flexShrink: 0
            }}>
              {editPhotoPreview ? (
                <img src={editPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserCircle size={32} color="var(--text-muted)" />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Guest Photo</label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--primary)', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                <Camera size={14} /> Change Photo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 20 * 1024 * 1024) { toast.error('Photo must be less than 20MB'); return; }
                    setCropImageSrc(URL.createObjectURL(file));
                  }
                  e.target.value = '';
                }} disabled={loading} />
              </label>
              {(editPhotoPreview) && (
                <button type="button" onClick={() => { setEditPhotoFile(null); setEditPhotoPreview(null); }} className="btn btn-ghost btn-sm" style={{ marginLeft: '12px', color: 'var(--danger)', fontSize: '12px' }} disabled={loading}>
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* 1. Guest Name */}
          <div className="form-group">
            <label className="form-label">Guest Name</label>
            <input type="text" className="form-input no-icon" value={editForm.guest_name}
              onChange={e => setEditForm(f => ({ ...f, guest_name: e.target.value }))} />
          </div>

          {/* 2. Phone Number */}
          <div className="form-group">
            <label className="form-label">Phone {!editForm.is_international && <span className="required">*</span>}</label>
            <input type="tel" className="form-input no-icon" value={editForm.phone_number}
              onChange={e => setEditForm(f => ({ ...f, phone_number: e.target.value }))} />
          </div>

          {/* 3. Occupation (optional) */}
          <div className="form-group">
            <label className="form-label">Occupation</label>
            <input type="text" className="form-input no-icon" placeholder="e.g., Engineer, Teacher"
              value={editForm.occupation}
              onChange={e => setEditForm(f => ({ ...f, occupation: e.target.value }))} />
          </div>

          {/* 4. Address */}
          <div className="form-group">
            <label className="form-label">Address</label>
            <input type="text" className="form-input no-icon" value={editForm.place}
              onChange={e => setEditForm(f => ({ ...f, place: e.target.value }))} />
          </div>

          {/* International toggle in edit modal */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 14px', background: editForm.is_international ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)', border: editForm.is_international ? '1.5px solid var(--primary)' : '1.5px solid var(--border)', borderRadius: 10, transition: 'all 0.2s' }}>
              <input type="checkbox" checked={editForm.is_international}
                onChange={e => setEditForm(f => ({ ...f, is_international: e.target.checked, state: '', country: '', district: '' }))}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>🌍 International Guest</span>
            </label>
          </div>

          {/* 4. State (domestic) or Country (international) */}
          {!editForm.is_international ? (
            <div className="form-group">
              <label className="form-label">State</label>
              <select className="form-input no-icon" value={editForm.state}
                onChange={e => setEditForm(f => ({ ...f, state: e.target.value, district: '' }))}>
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

          {/* 5. District — dropdown for TN/KA, text input otherwise */}
          {!editForm.is_international && (
            <div className="form-group">
              <label className="form-label">District</label>
              {DISTRICTS_BY_STATE[editForm.state] ? (
                <select className="form-input no-icon" value={editForm.district}
                  onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))}>
                  <option value="">Select District</option>
                  {DISTRICTS_BY_STATE[editForm.state].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <input type="text" className="form-input no-icon" value={editForm.district}
                  onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))} />
              )}
            </div>
          )}

          {[['purpose', 'Purpose', 'text', true], ['donation_amount', 'Donation (₹)', 'number', false], ['phone_number', 'Phone', 'tel', 'phone_conditional'], ['picked_date', 'Picked Date', 'date', false], ['picked_from', 'Picked From', 'text', false], ['picked_time', 'Picked Time', 'time', false]].map(([k, lbl, type, req]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{lbl} {req === 'phone_conditional' ? (!editForm.is_international && <span className="required">*</span>) : (req && <span className="required">*</span>)}</label>
              <input type={type} className="form-input no-icon" value={editForm[k]}
                onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} min={type === 'number' ? 0 : undefined}
                required={req === 'phone_conditional' ? !editForm.is_international : req} />
            </div>
          ))}

          {/* Handled By — dropdown for super_admin, text for sub_admin */}
          <div className="form-group">
            <label className="form-label">Handled By <span className="required">*</span></label>
            {profile?.role === 'super_admin' ? (
              <select className="form-input no-icon" value={editForm.handled_by}
                onChange={e => setEditForm(f => ({ ...f, handled_by: e.target.value }))} required>
                <option value="">Select person...</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role === 'super_admin' ? 'Super Admin' : 'Sub Admin'})
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" className="form-input no-icon" value={profile?.name || ''}
                readOnly disabled required />
            )}
          </div>
          
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

      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={(croppedFile, previewUrl) => {
            setEditPhotoFile(croppedFile);
            setEditPhotoPreview(previewUrl);
            setCropImageSrc(null);
          }}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
};

export default GuestRecords;
