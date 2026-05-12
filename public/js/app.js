// Shared utilities used across all pages

async function getUser() {
  const res = await fetch('/api/auth/me')
  return (await res.json()).user
}

async function requireAuth(role) {
  const user = await getUser()
  if (!user) { location.href = '/login.html'; return null }
  if (role === 'admin' && user.role !== 'admin') { location.href = '/dashboard.html'; return null }
  if (role === 'client' && user.role === 'admin') { location.href = '/admin.html'; return null }
  return user
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  location.href = '/login.html'
}

function renderNav(user) {
  const links = user.role === 'admin'
    ? `<a href="/admin.html" class="text-sm text-gray-600 hover:text-green-600 font-medium">Dashboard</a>
       <a href="/admin-availability.html" class="text-sm text-gray-600 hover:text-green-600 font-medium">My Availability</a>`
    : `<a href="/dashboard.html" class="text-sm text-gray-600 hover:text-green-600 font-medium">Dashboard</a>
       <a href="/availability.html" class="text-sm text-gray-600 hover:text-green-600 font-medium">Availability</a>
       <a href="/book.html" class="text-sm text-gray-600 hover:text-green-600 font-medium">Book</a>`

  document.getElementById('nav').innerHTML = `
    <nav class="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="${user.role === 'admin' ? '/admin.html' : '/dashboard.html'}" class="flex items-center gap-2">
          <span class="text-2xl">🧹</span>
          <span class="font-bold text-gray-900 text-lg">Addy<span class="text-green-600">Cleans</span></span>
        </a>
        <div class="flex items-center gap-5">
          ${links}
          <button onclick="logout()" class="text-sm text-red-500 hover:text-red-600 font-medium">Sign out</button>
        </div>
      </div>
    </nav>`
}

function fmt(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(s) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function toYMD(d) {
  return d.toISOString().split('T')[0]
}

function getMonday(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function statusBadge(s) {
  const map = { pending: 'bg-amber-100 text-amber-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }
  return `<span class="text-xs px-2 py-0.5 rounded-full font-medium ${map[s] || 'bg-gray-100 text-gray-600'}">${s}</span>`
}
