import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Export guest visit records to an Excel (.xlsx) file.
 * @param {Array} records - array of guest_visits (with visited_places joined)
 * @param {string} filename
 */
export function exportToExcel(records, filename = 'guest-records') {
  const rows = records.map((r, i) => ({
    'Sl No': i + 1,
    'Guest Name': r.guest_name || '',
    'Phone Number': r.phone_number || '',
    'Place': r.place || '',
    'Picked From': r.picked_from || '',
    'Visited Places': (r.visited_places || []).map(vp => vp.visited_place).join(', '),
    'Guest Returned': r.guest_returned ? 'Yes' : 'No',
    'Return Time': r.return_time || '',
    'Handled By': r.handled_by || '',
    'Remarks': r.remarks || '',
    'Created By': r.profiles?.name || '',
    'Date': r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 6 },  // Sl No
    { wch: 22 }, // Guest Name
    { wch: 15 }, // Phone
    { wch: 18 }, // Place
    { wch: 20 }, // Picked From
    { wch: 35 }, // Visited Places
    { wch: 15 }, // Returned
    { wch: 14 }, // Return Time
    { wch: 22 }, // Handled By
    { wch: 30 }, // Remarks
    { wch: 18 }, // Created By
    { wch: 18 }, // Date
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Guest Records');

  const dateStr = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `${filename}-${dateStr}.xlsx`);
}
