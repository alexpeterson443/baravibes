const express = require('express')
const session = require('express-session')
const bcrypt = require('bcryptjs')
const { createClient } = require('@libsql/client')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000

// ─── Database ──────────────────────────────────────────────────────────────────

let _db
function getDb() {
  if (!_db) {
    if (process.env.TURSO_DATABASE_URL) {
      _db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })
    } else {
      const dir = path.join(__dirname, 'data')
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      _db = createClient({ url: `file:${path.join(dir, 'local.db')}` })
    }
  }
  return _db
}

function toObj(r) {
  if (!r) return null
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]))
}
function toObjs(rs) { return rs.map(toObj) }

async function q(sql, args = []) { return getDb().execute({ sql, args }) }

async function initDb() {
  await getDb().batch([
    { sql: `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'client', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS admin_availability (id INTEGER PRIMARY KEY AUTOINCREMENT, day_of_week INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL)`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS client_availability (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, week_start TEXT NOT NULL, day_of_week INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, conflict_notes TEXT)`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS booking_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, requested_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, message TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`, args: [] },
  ], 'write')
}

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, secure: process.env.NODE_ENV === 'production' }
}))

const auth = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Unauthorized' })
const adminAuth = (req, res, next) => (req.session.user?.role === 'admin') ? next() : res.status(401).json({ error: 'Unauthorized' })

// ─── Auth ──────────────────────────────────────────────────────────────────────

app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }))

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const existing = (await q('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])).rows[0]
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 10)
    const role = email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'client'
    const result = await q('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email.toLowerCase(), passwordHash, role])

    req.session.user = { id: Number(result.lastInsertRowid), name, email: email.toLowerCase(), role }
    res.json({ role })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = toObj((await q('SELECT * FROM users WHERE email = ?', [email.toLowerCase()])).rows[0])
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role }
    res.json({ role: user.role })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

app.post('/api/auth/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }) })

// ─── Availability ──────────────────────────────────────────────────────────────

app.get('/api/availability', auth, async (req, res) => {
  const { weekStart } = req.query
  if (weekStart) {
    const r = await q('SELECT * FROM client_availability WHERE client_id = ? AND week_start = ?', [req.session.user.id, weekStart])
    return res.json({ slots: toObjs(r.rows) })
  }
  const [adminAvail, accepted] = await Promise.all([
    q('SELECT * FROM admin_availability ORDER BY day_of_week, start_time'),
    q(`SELECT br.*, u.name as client_name FROM booking_requests br JOIN users u ON br.client_id = u.id WHERE br.status = 'accepted'`)
  ])
  res.json({ adminAvailability: toObjs(adminAvail.rows), acceptedBookings: toObjs(accepted.rows) })
})

app.post('/api/availability', auth, async (req, res) => {
  try {
    const { weekStart, slots } = req.body
    const cid = req.session.user.id
    await getDb().batch([
      { sql: 'DELETE FROM client_availability WHERE client_id = ? AND week_start = ?', args: [cid, weekStart] },
      ...slots.map(s => ({ sql: 'INSERT INTO client_availability (client_id, week_start, day_of_week, start_time, end_time, conflict_notes) VALUES (?, ?, ?, ?, ?, ?)', args: [cid, weekStart, s.day_of_week, s.start_time, s.end_time, s.conflict_notes || null] }))
    ], 'write')
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// ─── Bookings ──────────────────────────────────────────────────────────────────

app.get('/api/bookings', auth, async (req, res) => {
  const [mine, accepted] = await Promise.all([
    q('SELECT * FROM booking_requests WHERE client_id = ? ORDER BY requested_date DESC', [req.session.user.id]),
    q(`SELECT br.*, u.name as client_name FROM booking_requests br JOIN users u ON br.client_id = u.id WHERE br.status = 'accepted'`)
  ])
  res.json({ myBookings: toObjs(mine.rows), acceptedBookings: toObjs(accepted.rows) })
})

app.post('/api/bookings', auth, async (req, res) => {
  try {
    const { date, startTime, endTime, message } = req.body
    if (!date || !startTime || !endTime) return res.status(400).json({ error: 'Missing fields' })
    await q('INSERT INTO booking_requests (client_id, requested_date, start_time, end_time, message) VALUES (?, ?, ?, ?, ?)', [req.session.user.id, date, startTime, endTime, message || null])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

// ─── Admin ─────────────────────────────────────────────────────────────────────

app.get('/api/admin/availability', adminAuth, async (req, res) => {
  const r = await q('SELECT * FROM admin_availability ORDER BY day_of_week, start_time')
  res.json({ slots: toObjs(r.rows) })
})

app.post('/api/admin/availability', adminAuth, async (req, res) => {
  try {
    const { slots } = req.body
    await getDb().batch([
      { sql: 'DELETE FROM admin_availability', args: [] },
      ...slots.map(s => ({ sql: 'INSERT INTO admin_availability (day_of_week, start_time, end_time) VALUES (?, ?, ?)', args: [s.day_of_week, s.start_time, s.end_time] }))
    ], 'write')
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

app.get('/api/admin/clients', adminAuth, async (req, res) => {
  const { weekStart } = req.query
  const [clients, avail] = await Promise.all([
    q("SELECT id, name, email FROM users WHERE role = 'client' ORDER BY name"),
    weekStart ? q(`SELECT ca.*, u.name as client_name FROM client_availability ca JOIN users u ON ca.client_id = u.id WHERE ca.week_start = ? ORDER BY ca.day_of_week, ca.start_time`, [weekStart]) : Promise.resolve({ rows: [] })
  ])
  res.json({ clients: toObjs(clients.rows), availability: toObjs(avail.rows) })
})

app.get('/api/admin/bookings', adminAuth, async (req, res) => {
  const r = await q(`SELECT br.*, u.name as client_name, u.email as client_email FROM booking_requests br JOIN users u ON br.client_id = u.id ORDER BY br.created_at DESC`)
  res.json({ requests: toObjs(r.rows) })
})

app.patch('/api/admin/bookings/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body
    if (!['accepted', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
    await q('UPDATE booking_requests SET status = ? WHERE id = ?', [status, Number(req.params.id)])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  await initDb()
  console.log(`✅ AddyCleans running at http://localhost:${PORT}`)
})
