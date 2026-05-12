import { createClient } from '@libsql/client'
import path from 'path'
import fs from 'fs'

let _client = null
let _initPromise = null

function getClient() {
  if (_client) return _client

  if (process.env.TURSO_DATABASE_URL) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  } else {
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    _client = createClient({ url: `file:${path.join(dataDir, 'local.db')}` })
  }

  return _client
}

function toObj(r) {
  if (!r) return null
  return Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])
  )
}
function toObjs(rs) {
  return rs.map(toObj)
}

async function ensureInit() {
  if (!_initPromise) {
    const c = getClient()
    _initPromise = c.batch(
      [
        {
          sql: `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'client',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS admin_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS client_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            week_start TEXT NOT NULL,
            day_of_week INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            conflict_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          args: [],
        },
        {
          sql: `CREATE TABLE IF NOT EXISTS booking_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            requested_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            message TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          args: [],
        },
      ],
      'write'
    )
  }
  return _initPromise
}

async function q(sql, args = []) {
  await ensureInit()
  return getClient().execute({ sql, args })
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function createUser({ name, email, passwordHash, role = 'client' }) {
  const r = await q(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, role]
  )
  return { lastInsertRowid: Number(r.lastInsertRowid) }
}

export async function getUserByEmail(email) {
  const r = await q('SELECT * FROM users WHERE email = ?', [email])
  return toObj(r.rows[0])
}

export async function getAllClients() {
  const r = await q("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name")
  return toObjs(r.rows)
}

// ─── Admin Availability ───────────────────────────────────────────────────────

export async function getAdminAvailability() {
  const r = await q('SELECT * FROM admin_availability ORDER BY day_of_week, start_time')
  return toObjs(r.rows)
}

export async function setAdminAvailability(slots) {
  await ensureInit()
  await getClient().batch(
    [
      { sql: 'DELETE FROM admin_availability', args: [] },
      ...slots.map((s) => ({
        sql: 'INSERT INTO admin_availability (day_of_week, start_time, end_time) VALUES (?, ?, ?)',
        args: [s.day_of_week, s.start_time, s.end_time],
      })),
    ],
    'write'
  )
}

// ─── Client Availability ──────────────────────────────────────────────────────

export async function setClientAvailability(clientId, weekStart, slots) {
  await ensureInit()
  await getClient().batch(
    [
      {
        sql: 'DELETE FROM client_availability WHERE client_id = ? AND week_start = ?',
        args: [clientId, weekStart],
      },
      ...slots.map((s) => ({
        sql: 'INSERT INTO client_availability (client_id, week_start, day_of_week, start_time, end_time, conflict_notes) VALUES (?, ?, ?, ?, ?, ?)',
        args: [clientId, weekStart, s.day_of_week, s.start_time, s.end_time, s.conflict_notes || null],
      })),
    ],
    'write'
  )
}

export async function getClientAvailabilityForWeek(weekStart) {
  const r = await q(
    `SELECT ca.*, u.name as client_name
     FROM client_availability ca
     JOIN users u ON ca.client_id = u.id
     WHERE ca.week_start = ?
     ORDER BY ca.day_of_week, ca.start_time`,
    [weekStart]
  )
  return toObjs(r.rows)
}

export async function getMyAvailabilityForWeek(clientId, weekStart) {
  const r = await q(
    'SELECT * FROM client_availability WHERE client_id = ? AND week_start = ?',
    [clientId, weekStart]
  )
  return toObjs(r.rows)
}

// ─── Booking Requests ─────────────────────────────────────────────────────────

export async function createBookingRequest({ clientId, date, startTime, endTime, message }) {
  await q(
    'INSERT INTO booking_requests (client_id, requested_date, start_time, end_time, message) VALUES (?, ?, ?, ?, ?)',
    [clientId, date, startTime, endTime, message || null]
  )
}

export async function getAllBookingRequests() {
  const r = await q(
    `SELECT br.*, u.name as client_name, u.email as client_email
     FROM booking_requests br
     JOIN users u ON br.client_id = u.id
     ORDER BY br.created_at DESC`
  )
  return toObjs(r.rows)
}

export async function getAcceptedBookings() {
  const r = await q(
    `SELECT br.*, u.name as client_name
     FROM booking_requests br
     JOIN users u ON br.client_id = u.id
     WHERE br.status = 'accepted'
     ORDER BY br.requested_date ASC, br.start_time ASC`
  )
  return toObjs(r.rows)
}

export async function getClientBookings(clientId) {
  const r = await q(
    'SELECT * FROM booking_requests WHERE client_id = ? ORDER BY requested_date DESC, start_time DESC',
    [clientId]
  )
  return toObjs(r.rows)
}

export async function updateBookingStatus(id, status) {
  await q('UPDATE booking_requests SET status = ? WHERE id = ?', [status, id])
}
