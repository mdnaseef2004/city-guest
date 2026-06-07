// Local Database - All data stored in localStorage
// Simulates a full relational database with users and guests

const KEYS = {
  USERS: 'grd_users',
  GUESTS: 'grd_guests',
  SESSION: 'grd_session',
};

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

function getStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function signUp({ name, email, password, role = 'sub_admin' }) {
  const users = getStore(KEYS.USERS);
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('A user with this email already exists.');
  }
  const user = {
    id: generateId(),
    name,
    email: email.toLowerCase(),
    password, // plain text for localStorage (no real security needed here)
    role,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  setStore(KEYS.USERS, users);
  return { ...user, password: undefined };
}

export function signIn(email, password) {
  const users = getStore(KEYS.USERS);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('Invalid email or password.');
  if (user.password !== password) throw new Error('Invalid email or password.');
  if (!user.is_active) throw new Error('Your account has been disabled. Please contact the administrator.');
  const session = { ...user, password: undefined };
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(KEYS.SESSION);
}

export function getSession() {
  try {
    const s = localStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

// ─── Users (profiles) ────────────────────────────────────────────────────────

export function getUsers() {
  return getStore(KEYS.USERS).map(u => ({ ...u, password: undefined }));
}

export function createUser({ name, email, password, role }) {
  return signUp({ name, email, password, role });
}

export function updateUser(id, updates) {
  const users = getStore(KEYS.USERS);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found.');
  users[idx] = { ...users[idx], ...updates };
  setStore(KEYS.USERS, users);
  // Update session if editing self
  const session = getSession();
  if (session && session.id === id) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify({ ...session, ...updates, password: undefined }));
  }
  return { ...users[idx], password: undefined };
}

export function deleteUser(id) {
  const users = getStore(KEYS.USERS).filter(u => u.id !== id);
  setStore(KEYS.USERS, users);
}

// ─── Guests ──────────────────────────────────────────────────────────────────

export function getGuests({ enteredBy, startDate, endDate, place, purpose, search, page = 1, perPage = 20 } = {}) {
  const session = getSession();
  let guests = getStore(KEYS.GUESTS);
  const users = getStore(KEYS.USERS);

  // RLS: sub_admin sees only own entries
  if (session?.role !== 'super_admin') {
    guests = guests.filter(g => g.entered_by === session?.id);
  }

  if (enteredBy) guests = guests.filter(g => g.entered_by === enteredBy);
  if (place) guests = guests.filter(g => g.place.toLowerCase() === place.toLowerCase());
  if (purpose) guests = guests.filter(g => g.purpose.toLowerCase() === purpose.toLowerCase());
  if (search) guests = guests.filter(g => g.guest_name.toLowerCase().includes(search.toLowerCase()));
  if (startDate) guests = guests.filter(g => g.created_at >= startDate);
  if (endDate) {
    const end = endDate.endsWith('T') ? endDate : endDate + 'T23:59:59.999Z';
    guests = guests.filter(g => g.created_at <= end);
  }

  // Sort newest first
  guests = guests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Join with profile name
  guests = guests.map(g => ({
    ...g,
    profiles: users.find(u => u.id === g.entered_by) ? { name: users.find(u => u.id === g.entered_by).name } : { name: 'Unknown' },
  }));

  const total = guests.length;
  const data = guests.slice((page - 1) * perPage, page * perPage);
  return { data, total };
}

export function getAllGuestsForReports({ startDate, endDate, enteredBy, onlyDonations } = {}) {
  const session = getSession();
  const users = getStore(KEYS.USERS);
  let guests = getStore(KEYS.GUESTS);

  if (session?.role !== 'super_admin') {
    guests = guests.filter(g => g.entered_by === session?.id);
  }

  if (enteredBy) guests = guests.filter(g => g.entered_by === enteredBy);
  if (startDate) guests = guests.filter(g => g.created_at.slice(0, 10) >= startDate);
  if (endDate) guests = guests.filter(g => g.created_at.slice(0, 10) <= endDate);
  if (onlyDonations) guests = guests.filter(g => g.donation_amount > 0);

  return guests
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(g => ({
      ...g,
      profiles: { name: users.find(u => u.id === g.entered_by)?.name || 'Unknown' },
    }));
}

export function addGuest({ guest_name, place, purpose, donation_amount, mobile_number, remarks }) {
  const session = getSession();
  if (!session) throw new Error('Not authenticated.');
  const guests = getStore(KEYS.GUESTS);
  const guest = {
    id: generateId(),
    guest_name,
    place,
    purpose,
    donation_amount: Number(donation_amount) || 0,
    mobile_number: mobile_number || '',
    remarks: remarks || '',
    entered_by: session.id,
    created_at: new Date().toISOString(),
  };
  guests.push(guest);
  setStore(KEYS.GUESTS, guests);
  return guest;
}

export function updateGuest(id, updates) {
  const session = getSession();
  const guests = getStore(KEYS.GUESTS);
  const idx = guests.findIndex(g => g.id === id);
  if (idx === -1) throw new Error('Guest not found.');
  if (session?.role !== 'super_admin' && guests[idx].entered_by !== session?.id) {
    throw new Error('Permission denied.');
  }
  guests[idx] = { ...guests[idx], ...updates, donation_amount: Number(updates.donation_amount) || 0 };
  setStore(KEYS.GUESTS, guests);
  return guests[idx];
}

export function deleteGuest(id) {
  const session = getSession();
  const guests = getStore(KEYS.GUESTS);
  const guest = guests.find(g => g.id === id);
  if (!guest) throw new Error('Guest not found.');
  if (session?.role !== 'super_admin' && guest.entered_by !== session?.id) {
    throw new Error('Permission denied.');
  }
  setStore(KEYS.GUESTS, guests.filter(g => g.id !== id));
}

export function checkDuplicateGuest(guestName) {
  const session = getSession();
  const today = new Date().toISOString().slice(0, 10);
  const guests = getStore(KEYS.GUESTS);
  return guests.some(g =>
    g.entered_by === session?.id &&
    g.guest_name.toLowerCase().trim() === guestName.toLowerCase().trim() &&
    g.created_at.slice(0, 10) === today
  );
}

export function getUniquePlaces() {
  const session = getSession();
  let guests = getStore(KEYS.GUESTS);
  if (session?.role !== 'super_admin') {
    guests = guests.filter(g => g.entered_by === session?.id);
  }
  return [...new Set(guests.map(g => g.place))].filter(Boolean).sort();
}

export function getUniquePurposes() {
  const session = getSession();
  let guests = getStore(KEYS.GUESTS);
  if (session?.role !== 'super_admin') {
    guests = guests.filter(g => g.entered_by === session?.id);
  }
  return [...new Set(guests.map(g => g.purpose))].filter(Boolean).sort();
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export function getDashboardStats() {
  const session = getSession();
  const users = getStore(KEYS.USERS);
  let guests = getStore(KEYS.GUESTS);

  if (session?.role !== 'super_admin') {
    guests = guests.filter(g => g.entered_by === session?.id);
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  const todayGuests = guests.filter(g => g.created_at.slice(0, 10) === today);
  const monthGuests = guests.filter(g => g.created_at.slice(0, 7) === month);

  // Guests by place
  const placeMap = {};
  guests.forEach(g => { placeMap[g.place] = (placeMap[g.place] || 0) + 1; });
  const guestsByPlace = Object.entries(placeMap)
    .map(([place, count]) => ({ place, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Guests by purpose
  const purposeMap = {};
  guests.forEach(g => { purposeMap[g.purpose] = (purposeMap[g.purpose] || 0) + 1; });
  const guestsByPurpose = Object.entries(purposeMap)
    .map(([purpose, count]) => ({ purpose, count }))
    .sort((a, b) => b.count - a.count);

  // Sub admin performance
  const subAdminPerf = users
    .filter(u => u.role === 'sub_admin')
    .map(u => {
      const ug = guests.filter(g => g.entered_by === u.id);
      const lastEntry = ug.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      return {
        name: u.name,
        totalEntries: ug.length,
        totalDonations: ug.reduce((s, g) => s + (g.donation_amount || 0), 0),
        lastEntry: lastEntry ? lastEntry.created_at : null,
      };
    })
    .sort((a, b) => b.totalEntries - a.totalEntries);

  return {
    totalGuests: guests.length,
    totalDonations: guests.reduce((s, g) => s + (g.donation_amount || 0), 0),
    todayGuests: todayGuests.length,
    monthlyDonations: monthGuests.reduce((s, g) => s + (g.donation_amount || 0), 0),
    guestsByPlace,
    guestsByPurpose,
    subAdminPerf,
  };
}
