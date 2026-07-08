// ── Supabase Database Layer ──────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp({ name, email, password, role = 'sub_admin' }) {
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const actualRole = count === 0 ? 'super_admin' : role;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    name,
    email: email.toLowerCase(),
    role: actualRole,
    is_active: true,
  });
  if (profileError) throw profileError;

  return { ...data, role: actualRole };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createUser({ name, email, password, role }) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

  if (!SERVICE_KEY) throw new Error('Service key is missing from .env file');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });

  const created = await res.json();
  console.log('Supabase Admin API response:', res.status, created);

  if (!res.ok) {
    const msg = created?.msg || created?.message || created?.error_description || created?.error || JSON.stringify(created);
    throw new Error(msg);
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: created.id,
    name,
    email: email.toLowerCase(),
    role: role || 'sub_admin',
    is_active: true,
  });
  if (profileError) throw new Error(`User created in Auth but profile failed: ${profileError.message}`);
  return created;
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteUser(id) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

  // Step 1: Delete from Supabase Auth (blocks login completely)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to delete user from Auth');
  }

  // Step 2: Delete from profiles
  // guest_visits.created_by will automatically become NULL (SET NULL constraint)
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadGuestPDF(visitId, pdfBlob) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

  const fileName = `${visitId}-${Date.now()}.pdf`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pdfs/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/pdf',
    },
    body: pdfBlob
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to upload PDF');
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/pdfs/${fileName}`;
  
  const { error } = await supabase.from('guest_visits').update({ pdf_url: publicUrl }).eq('id', visitId);
  if (error) throw error;

  return publicUrl;
}

export async function uploadAvatar(userId, file) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pdfs/avatars/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to upload profile picture');
  }

  return `${SUPABASE_URL}/storage/v1/object/public/pdfs/avatars/${fileName}`;
}

export async function uploadGuestPhoto(file) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

  const fileExt = file.name.split('.').pop();
  const fileName = `guest-photo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pdfs/photos/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': file.type || 'image/jpeg',
    },
    body: file
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to upload guest photo');
  }

  return `${SUPABASE_URL}/storage/v1/object/public/pdfs/photos/${fileName}`;
}

// ── Guests ────────────────────────────────────────────────────────────────────

export async function addGuest({ guest_name, phone_number, occupation, photo_url, place, district, state, country, is_international, purpose, donation_amount, receipt_no, picked_from, picked_date, picked_time, guest_returned, return_date, return_time, handled_by, remarks, visits }) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // 1. Insert into guest_visits
  const { data: visitData, error: visitError } = await supabase.from('guest_visits').insert({
    guest_name,
    phone_number,
    occupation: occupation || null,
    photo_url: photo_url || null,
    place,
    district,
    state,
    country: country || null,
    is_international: is_international || false,
    purpose,
    donation_amount: Number(donation_amount) || 0,
    receipt_no: receipt_no || null,
    picked_from: picked_from || '',
    picked_date: picked_date || null,
    picked_time: picked_time || null,
    guest_returned,
    return_date: return_date || null,
    return_time: return_time || null,
    handled_by: handled_by || '',
    remarks: remarks || '',
    created_by: user.id,
  }).select('id').single();
  
  if (visitError) throw visitError;

  // 2. Insert into visited_places if any
  if (visits && visits.length > 0) {
    const placesToInsert = visits.map(v => ({
      guest_visit_id: visitData.id,
      visited_place: v.visited_place,
      visit_date: v.visit_date || null,
      time_in: v.time_in,
      time_out: v.time_out
    }));
    
    const { error: placesError } = await supabase.from('visited_places').insert(placesToInsert);
    if (placesError) throw placesError;
  }

  return visitData;
}

export async function checkDuplicateGuest(guestName) {
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase.from('guest_visits')
    .select('id')
    .eq('created_by', user.id)
    .ilike('guest_name', guestName.trim())
    .gte('created_at', today + 'T00:00:00.000Z')
    .lte('created_at', today + 'T23:59:59.999Z');
  return data && data.length > 0;
}

export async function getGuests({ search, startDate, endDate, place, districtFilter, purpose, createdBy, handledBy, stateFilter, countryFilter, page = 1, perPage = 20 } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  let query = supabase
    .from('guest_visits')
    .select('*, profiles!created_by(name), visited_places(*)', { count: 'exact' });

  if (myProfile?.role !== 'super_admin') query = query.eq('created_by', user.id);
  if (search) query = query.ilike('guest_name', `%${search}%`);
  if (place) query = query.eq('place', place);
  if (purpose) query = query.eq('purpose', purpose);
  if (createdBy) query = query.eq('created_by', createdBy);
  if (handledBy) query = query.eq('handled_by', handledBy);
  if (districtFilter) query = query.eq('district', districtFilter);
  if (stateFilter) query = query.eq('state', stateFilter);
  if (countryFilter) query = query.eq('country', countryFilter);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
}

export async function updateGuest(id, updates, visitsUpdates) {
  // Update guest_visits
  const { data, error } = await supabase
    .from('guest_visits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // Replace visited_places
  if (visitsUpdates) {
    // Delete old
    await supabase.from('visited_places').delete().eq('guest_visit_id', id);
    // Insert new
    if (visitsUpdates.length > 0) {
      const placesToInsert = visitsUpdates.map(v => ({
        guest_visit_id: id,
        visited_place: v.visited_place,
        visit_date: v.visit_date || null,
        time_in: v.time_in,
        time_out: v.time_out
      }));
      const { error: placesError } = await supabase.from('visited_places').insert(placesToInsert);
      if (placesError) throw placesError;
    }
  }

  return data;
}

export async function deleteGuest(id) {
  const { error } = await supabase.from('guest_visits').delete().eq('id', id);
  if (error) throw error;
}

export async function getUniquePlaces() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  let query = supabase.from('guest_visits').select('place');
  if (myProfile?.role !== 'super_admin') query = query.eq('created_by', user.id);
  const { data } = await query;
  return [...new Set((data || []).map(g => g.place).filter(Boolean))].sort();
}

export async function getUniqueDistricts() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  let query = supabase.from('guest_visits').select('district');
  if (myProfile?.role !== 'super_admin') query = query.eq('created_by', user.id);
  const { data } = await query;
  return [...new Set((data || []).map(g => g.district).filter(Boolean))].sort();
}

export async function getUniquePurposes() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  let query = supabase.from('guest_visits').select('purpose');
  if (myProfile?.role !== 'super_admin') query = query.eq('created_by', user.id);
  const { data } = await query;
  return [...new Set((data || []).map(g => g.purpose).filter(Boolean))].sort();
}

export async function getUniqueHandledBy() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  let query = supabase.from('guest_visits').select('handled_by');
  if (myProfile?.role !== 'super_admin') query = query.eq('created_by', user.id);
  const { data } = await query;
  return [...new Set((data || []).map(g => g.handled_by).filter(Boolean))].sort();
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  let guestsQuery = supabase.from('guest_visits').select('*');
  if (myProfile?.role !== 'super_admin') guestsQuery = guestsQuery.eq('created_by', user.id);

  const [{ data: guests }, { data: allUsers }] = await Promise.all([
    guestsQuery,
    supabase.from('profiles').select('*'),
  ]);

  const g = guests || [];
  const u = allUsers || [];
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  const todayGuests = g.filter(x => x.created_at.slice(0, 10) === today);
  const monthGuests = g.filter(x => x.created_at.slice(0, 7) === month);

  const placeMap = {};
  g.forEach(x => { placeMap[x.place] = (placeMap[x.place] || 0) + 1; });
  const guestsByPlace = Object.entries(placeMap)
    .map(([place, count]) => ({ place, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const purposeMap = {};
  g.forEach(x => { purposeMap[x.purpose] = (purposeMap[x.purpose] || 0) + 1; });
  const guestsByPurpose = Object.entries(purposeMap)
    .map(([purpose, count]) => ({ purpose, count }))
    .sort((a, b) => b.count - a.count);

  const subAdminPerf = u.filter(x => x.role === 'sub_admin').map(x => {
    const ug = g.filter(r => r.created_by === x.id);
    const last = [...ug].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {
      name: x.name,
      totalEntries: ug.length,
      totalDonations: ug.reduce((s, r) => s + (r.donation_amount || 0), 0),
      lastEntry: last?.created_at || null,
    };
  }).sort((a, b) => b.totalEntries - a.totalEntries);

  const superAdminPerf = u.filter(x => x.role === 'super_admin').map(x => {
    const ug = g.filter(r => r.created_by === x.id);
    const last = [...ug].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return {
      name: x.name,
      totalEntries: ug.length,
      totalDonations: ug.reduce((s, r) => s + (r.donation_amount || 0), 0),
      lastEntry: last?.created_at || null,
    };
  }).sort((a, b) => b.totalEntries - a.totalEntries);

  const recentPhotos = g
    .filter(x => x.photo_url)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20);

  return {
    totalGuests: g.length,
    totalDonations: g.reduce((s, x) => s + (x.donation_amount || 0), 0),
    todayGuests: todayGuests.length,
    monthlyDonations: monthGuests.reduce((s, x) => s + (x.donation_amount || 0), 0),
    guestsByPlace,
    guestsByPurpose,
    subAdminPerf,
    superAdminPerf,
    recentPhotos,
    rawGuests: g,
    allUsers: u,
  };
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getAllGuestsForReports({ startDate, endDate, createdBy, handledBy, onlyDonations } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const { data: allUsers } = await supabase.from('profiles').select('*');

  let query = supabase.from('guest_visits').select('*');
  if (myProfile?.role !== 'super_admin') query = query.eq('created_by', user.id);
  if (createdBy) query = query.eq('created_by', createdBy);
  if (handledBy) query = query.eq('handled_by', handledBy);
  if (startDate) query = query.gte('created_at', startDate + 'T00:00:00.000Z');
  if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999Z');
  if (onlyDonations) query = query.gt('donation_amount', 0);

  const { data: guests, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (guests || []).map(g => ({
    ...g,
    profiles: { name: (allUsers || []).find(u => u.id === g.created_by)?.name || 'Unknown' },
  }));
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function createAssignment({ guest_name, notes, assigned_to, due_date, is_urgent }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('guest_assignments')
    .insert({
      guest_name: guest_name.trim(),
      notes: notes?.trim() || null,
      assigned_to,
      assigned_by: user.id,
      status: 'pending',
      due_date: due_date || null,
      is_urgent: is_urgent || false
    })
    .select()
    .single();
  if (error) throw error;

  // Fire background push so the sub-admin is notified even when tab is closed
  const title = is_urgent
    ? '🚨 URGENT GUEST ASSIGNMENT'
    : '🔔 New Guest Assigned';
  const body = is_urgent
    ? `${guest_name.trim()} requires your IMMEDIATE attention!`
    : `${guest_name.trim()} has been assigned to you.`;
  await triggerBackgroundPush({ userId: assigned_to, title, body, isUrgent: is_urgent || false, url: '/assignments' });

  // Create persistent notification for Sub Admin
  await createNotification({
    userId: assigned_to,
    title,
    message: body,
    type: is_urgent ? 'urgent' : 'info'
  });

  // Create persistent notification for Super Admin (receipt)
  await createNotification({
    userId: user.id,
    title: 'Assignment Sent',
    message: `You assigned ${guest_name.trim()} to a Sub Admin.`,
    type: 'info'
  });

  return data;
}

export async function getAssignments() {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  let query = supabase
    .from('guest_assignments')
    .select(`
      *,
      profiles_assigned_to:assigned_to(name),
      profiles_assigned_by:assigned_by(name)
    `)
    .order('created_at', { ascending: false });

  if (myProfile?.role !== 'super_admin') {
    query = query.eq('assigned_to', user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateAssignmentStatus(id, status) {
  const { data, error } = await supabase
    .from('guest_assignments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(id) {
  const { error } = await supabase.from('guest_assignments').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToAssignments(userId, callback) {
  return supabase.channel(`assignments_${userId}_${Date.now()}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'guest_assignments',
      filter: `assigned_to=eq.${userId}`
    }, payload => callback(payload.new))
    .subscribe();
}

// ── Reminders (Broadcast) ─────────────────────────────────────────────────────

export async function sendUrgentReminder(assigned_to, guest_name) {
  // Send realtime broadcast (works when app is open)
  const channel = supabase.channel('urgent_reminders_broadcast');
  await new Promise((resolve, reject) => {
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'urgent_reminder',
          payload: { assigned_to, guest_name }
        });
        supabase.removeChannel(channel);
        resolve();
      }
      if (status === 'CHANNEL_ERROR') {
        reject(new Error('Failed to connect to broadcast channel'));
      }
    });
  });

  // Also send background push so device wakes up even if app is closed
  await triggerBackgroundPush({
    userId: assigned_to,
    title: '🚨 URGENT REMINDER',
    body: `Super Admin is reminding you about ${guest_name}! Open the app immediately.`,
    isUrgent: true,
    url: '/assignments',
  });

  // Create persistent notification for Sub Admin
  await createNotification({
    userId: assigned_to,
    title: '🚨 Urgent Reminder',
    message: `Super Admin is reminding you about ${guest_name}!`,
    type: 'reminder'
  });

  // Create persistent notification for Super Admin (the one who sent it)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await createNotification({
      userId: user.id,
      title: 'Reminder Sent',
      message: `You sent an urgent reminder to the Sub Admin regarding ${guest_name}.`,
      type: 'info'
    });
  }
}

export function subscribeToReminders(userId, callback) {
  const channel = supabase.channel('urgent_reminders_broadcast');
  channel.on('broadcast', { event: 'urgent_reminder' }, ({ payload }) => {
    if (payload.assigned_to === userId) {
      callback(payload);
    }
  }).subscribe();
  return channel;
}

// ── Push Subscription (Background Notifications) ──────────────────────────────

/**
 * Save a browser PushSubscription object for the current user.
 * Called after the user grants notification permission.
 */
export async function savePushSubscription(subscription) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const sub = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  }, { onConflict: 'user_id,endpoint' });

  if (error) console.warn('Failed to save push subscription:', error.message);
}

/**
 * Remove the push subscription for the current user (e.g. on logout).
 */
export async function deletePushSubscription(endpoint) {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);
  if (error) console.warn('Failed to delete push subscription:', error.message);
}

/**
 * Call the Vercel serverless function to send a background push notification
 * to a specific user even when their tab is closed.
 */
export async function triggerBackgroundPush({ userId, title, body, isUrgent = false, url = '/assignments' }) {
  try {
    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body, isUrgent, url }),
    });
  } catch (err) {
    console.warn('Background push failed:', err.message);
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function createNotification({ userId, title, message, type = 'info' }) {
  const { data, error } = await supabase.from('app_notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    is_read: false
  }).select().single();
  if (error) console.warn('Failed to create notification:', error.message);
  return data;
}

export async function getNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('app_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function markNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('app_notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
  if (error) console.warn('Failed to mark notifications read:', error.message);
}

export async function deleteNotification(id) {
  const { error } = await supabase.from('app_notifications').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToNotifications(userId, callback) {
  return supabase.channel(`app_notifications_channel_${userId}_${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'app_notifications',
      filter: `user_id=eq.${userId}`
    }, payload => callback(payload.new || payload.old))
    .subscribe();
}
