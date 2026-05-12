import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getSession } from '@/lib/session'
import { getClientBookings, getAdminAvailability, getAcceptedBookings } from '@/lib/db'
import { format, startOfWeek, addDays, parseISO, isToday, isFuture, isPast } from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function statusBadge(status) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

function WeekCalendar({ adminAvailability, acceptedBookings }) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Build a map: dayOfWeek -> { adminSlot, bookings[] }
  const availMap = {}
  for (const slot of adminAvailability) {
    availMap[slot.day_of_week] = slot
  }

  const bookingsByDay = {}
  for (const b of acceptedBookings) {
    const dow = new Date(b.requested_date + 'T00:00:00').getDay()
    if (!bookingsByDay[dow]) bookingsByDay[dow] = []
    bookingsByDay[dow].push(b)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">This Week&apos;s Schedule</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <Link
          href="/book"
          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          + Request booking
        </Link>
      </div>
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {days.map((day, i) => {
          const dow = day.getDay()
          const adminSlot = availMap[dow]
          const dayBookings = bookingsByDay[dow] || []
          const isCurrentDay = isToday(day)

          return (
            <div key={i} className={`p-3 ${isCurrentDay ? 'bg-green-50' : ''}`}>
              <div className="text-center mb-2">
                <div className={`text-xs font-medium ${isCurrentDay ? 'text-green-600' : 'text-gray-500'}`}>
                  {DAYS[dow]}
                </div>
                <div
                  className={`text-lg font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${
                    isCurrentDay ? 'bg-green-600 text-white' : 'text-gray-800'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>

              {adminSlot ? (
                <div className="space-y-1">
                  <div className="bg-green-50 border border-green-100 rounded text-center py-1 px-0.5">
                    <div className="text-xs text-green-600 font-medium leading-tight">
                      {adminSlot.start_time}–{adminSlot.end_time}
                    </div>
                  </div>
                  {dayBookings.map((b) => (
                    <div key={b.id} className="bg-blue-50 border border-blue-100 rounded px-1 py-1">
                      <div className="text-xs text-blue-700 font-medium truncate">{b.start_time}</div>
                      <div className="text-xs text-blue-500 truncate">{b.client_name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center mt-1">
                  <span className="text-xs text-gray-300">—</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-green-200 rounded" /> Addy available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-blue-200 rounded" /> Booked
        </span>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.user) redirect('/login')
  if (session.user.role === 'admin') redirect('/admin')

  const myBookings = getClientBookings(session.user.id)
  const adminAvailability = getAdminAvailability()
  const acceptedBookings = getAcceptedBookings()

  const upcoming = myBookings.filter(
    (b) => b.status === 'accepted' && (isFuture(parseISO(b.requested_date)) || isToday(parseISO(b.requested_date)))
  )
  const pending = myBookings.filter((b) => b.status === 'pending')
  const past = myBookings.filter(
    (b) => b.status === 'accepted' && isPast(parseISO(b.requested_date)) && !isToday(parseISO(b.requested_date))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your cleaning schedule at a glance.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Upcoming cleanings', value: upcoming.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending requests', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total sessions', value: myBookings.filter((b) => b.status === 'accepted').length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-white`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <WeekCalendar adminAvailability={adminAvailability} acceptedBookings={acceptedBookings} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/availability"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors group"
                >
                  <span className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-green-200 transition-colors">
                    📅
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">Set my availability</div>
                    <div className="text-xs text-gray-500">Tell Addy when you&apos;re home</div>
                  </div>
                </Link>
                <Link
                  href="/book"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 transition-colors group"
                >
                  <span className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-green-200 transition-colors">
                    ✍️
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-800">Request a booking</div>
                    <div className="text-xs text-gray-500">Pick a date and time</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* My bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">My Bookings</h3>
              {myBookings.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm text-gray-500">No bookings yet</p>
                  <Link href="/book" className="text-xs text-green-600 hover:underline mt-1 block">
                    Request your first session →
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {myBookings.slice(0, 8).map((b) => (
                    <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {format(parseISO(b.requested_date), 'EEE, MMM d')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {b.start_time} – {b.end_time}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
