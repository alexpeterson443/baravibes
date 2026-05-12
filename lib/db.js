import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const globalForDb = globalThis

export function getDb() {
  if (!globalForDb._db) {
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    globalForDb._db = new Database(path.join(dataDir, 'app.db'))
    globalForDb._db.pragma('journal_mode = WAL')
    globalForDb._db.pragma('foreign_keys = ON')

    globalForDb._db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'client',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS client_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        week_start TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        conflict_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS booking_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        requested_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id)
      );
    `)
  }
  return globalForDb._db
}

// ─── Users ───────────────────────────────────────────────────────────────────

export function createUser({ name, email, passwordHash, role = 'client' }) {
  const db = getDb()
  return db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, passwordHash, role)
}

export function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email)
}

export function getUserById(id) {
  return getDb().prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id)
}

export function getAllClients() {
  return getDb().prepare("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name").all()
}

// ─── Admin Availability ───────────────────────────────────────────────────────

export function getAdminAvailability() {
  return getDb().prepare('SELECT * FROM admin_availability ORDER BY day_of_week, start_time').all()
}

export function setAdminAvailability(slots) {
  const db = getDb()
  const del = db.prepare('DELETE FROM admin_availability')
  const ins = db.prepare('INSERT INTO admin_availability (day_of_week, start_time, end_time) VALUES (?, ?, ?)')
  const tx = db.transaction(() => {
    del.run()
    for (const slot of slots) {
      ins.run(slot.day_of_week, slot.start_time, slot.end_time)
    }
  })
  tx()
}

// ─── Client Availability ──────────────────────────────────────────────────────

export function setClientAvailability(clientId, weekStart, slots) {
  const db = getDb()
  const del = db.prepare('DELETE FROM client_availability WHERE client_id = ? AND week_start = ?')
  const ins = db.prepare(
    'INSERT INTO client_availability (client_id, week_start, day_of_week, start_time, end_time, conflict_notes) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const tx = db.transaction(() => {
    del.run(clientId, weekStart)
    for (const slot of slots) {
      ins.run(clientId, weekStart, slot.day_of_week, slot.start_time, slot.end_time, slot.conflict_notes || null)
    }
  })
  tx()
}

export function getClientAvailabilityForWeek(weekStart) {
  return getDb()
    .prepare(
      `SELECT ca.*, u.name as client_name
       FROM client_availability ca
       JOIN users u ON ca.client_id = u.id
       WHERE ca.week_start = ?
       ORDER BY ca.day_of_week, ca.start_time`
    )
    .all(weekStart)
}

export function getMyAvailabilityForWeek(clientId, weekStart) {
  return getDb()
    .prepare('SELECT * FROM client_availability WHERE client_id = ? AND week_start = ?')
    .all(clientId, weekStart)
}

// ─── Booking Requests ─────────────────────────────────────────────────────────

export function createBookingRequest({ clientId, date, startTime, endTime, message }) {
  return getDb()
    .prepare(
      'INSERT INTO booking_requests (client_id, requested_date, start_time, end_time, message) VALUES (?, ?, ?, ?, ?)'
    )
    .run(clientId, date, startTime, endTime, message || null)
}

export function getAllBookingRequests() {
  return getDb()
    .prepare(
      `SELECT br.*, u.name as client_name, u.email as client_email
       FROM booking_requests br
       JOIN users u ON br.client_id = u.id
       ORDER BY br.created_at DESC`
    )
    .all()
}

export function getPendingBookingRequests() {
  return getDb()
    .prepare(
      `SELECT br.*, u.name as client_name, u.email as client_email
       FROM booking_requests br
       JOIN users u ON br.client_id = u.id
       WHERE br.status = 'pending'
       ORDER BY br.requested_date ASC, br.start_time ASC`
    )
    .all()
}

export function getAcceptedBookings() {
  return getDb()
    .prepare(
      `SELECT br.*, u.name as client_name
       FROM booking_requests br
       JOIN users u ON br.client_id = u.id
       WHERE br.status = 'accepted'
       ORDER BY br.requested_date ASC, br.start_time ASC`
    )
    .all()
}

export function getClientBookings(clientId) {
  return getDb()
    .prepare('SELECT * FROM booking_requests WHERE client_id = ? ORDER BY requested_date DESC, start_time DESC')
    .all(clientId)
}

export function updateBookingStatus(id, status) {
  return getDb()
    .prepare('UPDATE booking_requests SET status = ? WHERE id = ?')
    .run(status, id)
}
