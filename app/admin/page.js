'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { format, startOfWeek, addDays, addWeeks, parseISO } from 'date-fns'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_DISPLAY = [1, 2, 3, 4, 5, 6, 0]

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    accepted: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function ClientAvailabilityGrid({ availability, weekStart }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(parseISO(weekStart), i))

  const hours = Array.from({ length: 13 }, (_, i) => i + 7) // 7am–7pm

  function clientsAt(dow, hour) {
    return availability.filter((a) => {
      if (a.day_of_week !== dow) return false
      const [sh] = a.start_time.split(':').map(Number)
      const [eh] = a.end_time.split(':').map(Number)
      return hour >= sh && hour < eh
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="w-14 py-2 text-left text-gray-500 font-medium sticky left-0 bg-white">Time</th>
            {days.map((day, i) => (
              <th key={i} className="py-2 text-center text-gray-600 font-medium min-w-20">
                <div>{DAYS[i]}</div>
                <div className="text-gray-400 font-normal">{format(day, 'M/d')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour} className="border-t border-gray-100">
              <td className="py-1 pr-2 text-gray-400 sticky left-0 bg-white">
                {hour % 12 || 12}{hour >= 12 ? 'pm' : 'am'}
              </td>
              {DOW_DISPLAY.map((dow) => {
                const clients = clientsAt(dow, hour)
                return (
                  <td key={dow} className="py-1 px-0.5">
                    {clients.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5">
                        {clients.map((c) => (
                          <div key={c.id} className="bg-green-100 text-green-700 rounded px-1.5 py-0.5 text-xs leading-tight" title={c.conflict_notes || ''}>
                            {c.client_name.split(' ')[0]}
                            {c.conflict_notes && ' ⚠️'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [requests, setRequests] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [availability, setAvailability] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [actionLoading, setActionLoading] = useState(null)
  const [tab, setTab] = useState('requests')

  const weekStart = format(startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const loadData = useCallback(async () => {
    const [meRes, reqRes, clientRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/admin/bookings-all'),
      fetch(`/api/admin/clients?weekStart=${weekStart}`),
    ])

    const meData = await meRes.json()
    if (!meData.user || meData.user.role !== 'admin') {
      router.push('/login')
      return
    }
    setUser(meData.user)

    const reqData = await reqRes.json()
    setRequests((reqData.requests || []).filter((r) => r.status === 'pending'))
    setAllBookings(reqData.requests || [])

    const clientData = await clientRes.json()
    setAvailability(clientData.availability || [])
  }, [router, weekStart])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function updateStatus(id, status) {
    setActionLoading(id)
    await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadData()
    setActionLoading(null)
  }

  const accepted = allBookings.filter((b) => b.status === 'accepted')
  const rejected = allBookings.filter((b) => b.status === 'rejected')

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage bookings and see client availability.</p>
          </div>
          <button
            onClick={() => router.push('/admin/availability')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Set My Availability
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending requests', value: requests.length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Confirmed bookings', value: accepted.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Declined', value: rejected.length, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Total requests', value: allBookings.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-white`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'requests', label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` },
            { id: 'availability', label: 'Client Availability' },
            { id: 'history', label: 'All Bookings' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Pending Requests Tab */}
        {tab === 'requests' && (
          <div>
            {requests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">All caught up!</h3>
                <p className="text-gray-400 text-sm">No pending booking requests right now.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">{req.client_name}</div>
                        <div className="text-xs text-gray-500">{req.client_email}</div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 mb-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-1">
                        <span>📅</span>
                        {format(parseISO(req.requested_date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTime(req.start_time)} – {formatTime(req.end_time)}
                      </div>
                    </div>

                    {req.message && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-3 text-sm text-gray-700 italic">
                        &ldquo;{req.message}&rdquo;
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mb-4">
                      Requested {format(parseISO(req.created_at), 'MMM d, h:mm a')}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(req.id, 'accepted')}
                        disabled={actionLoading === req.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === req.id ? '…' : '✓ Accept'}
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, 'rejected')}
                        disabled={actionLoading === req.id}
                        className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === req.id ? '…' : '✗ Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Client Availability Tab */}
        {tab === 'availability' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Client Availability Grid</h2>
                <p className="text-xs text-gray-500 mt-0.5">See when your clients are free this week</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekOffset((p) => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  ←
                </button>
                <span className="text-sm font-medium text-gray-700 min-w-24 text-center">
                  {format(parseISO(weekStart), 'MMM d')} –{' '}
                  {format(addDays(parseISO(weekStart), 6), 'MMM d')}
                </span>
                <button
                  onClick={() => setWeekOffset((p) => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  →
                </button>
              </div>
            </div>
            <div className="p-6">
              {availability.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm">No clients have submitted availability for this week yet.</p>
                </div>
              ) : (
                <ClientAvailabilityGrid availability={availability} weekStart={weekStart} />
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-green-100 border border-green-200 rounded" /> Available
                </span>
                <span>⚠️ = has conflict notes (hover to see)</span>
              </div>
            </div>
          </div>
        )}

        {/* All Bookings Tab */}
        {tab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">All Booking Requests</h2>
            </div>
            {allBookings.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm">No booking requests yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allBookings.map((b) => (
                  <div key={b.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{b.client_name}</span>
                        <StatusBadge status={b.status} />
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {format(parseISO(b.requested_date), 'EEE, MMM d, yyyy')} •{' '}
                        {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </div>
                      {b.message && <div className="text-xs text-gray-400 mt-0.5 italic truncate">&ldquo;{b.message}&rdquo;</div>}
                    </div>
                    {b.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateStatus(b.id, 'accepted')}
                          disabled={actionLoading === b.id}
                          className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateStatus(b.id, 'rejected')}
                          disabled={actionLoading === b.id}
                          className="bg-white text-red-600 border border-red-200 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
