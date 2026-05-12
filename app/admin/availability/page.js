'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultSlots = () =>
  DAYS.map((_, dow) => ({
    day_of_week: dow,
    enabled: false,
    start_time: '09:00',
    end_time: '17:00',
  }))

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function AdminAvailabilityPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [slots, setSlots] = useState(defaultSlots())
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== 'admin') { router.push('/login'); return }
        setUser(d.user)
      })

    fetch('/api/admin/availability')
      .then((r) => r.json())
      .then((d) => {
        if (!d.slots) return
        setSlots((prev) =>
          prev.map((slot) => {
            const existing = d.slots.find((s) => s.day_of_week === slot.day_of_week)
            if (existing) {
              return { ...slot, enabled: true, start_time: existing.start_time, end_time: existing.end_time }
            }
            return slot
          })
        )
      })
  }, [router])

  function update(dow, field, value) {
    setSlots((prev) => prev.map((s) => (s.day_of_week === dow ? { ...s, [field]: value } : s)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)

    const activeSlots = slots.filter((s) => s.enabled).map(({ day_of_week, start_time, end_time }) => ({
      day_of_week,
      start_time,
      end_time,
    }))

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: activeSlots }),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save')
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
          >
            ← Back to dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Weekly Availability</h1>
          <p className="text-gray-500 mt-1">
            Set the days and hours you&apos;re available to take on cleaning sessions. Clients will only be able to book within these windows.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-100 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm flex items-center gap-2">
            <span>✅</span> Availability saved! Clients can now see and book these time slots.
          </div>
        )}

        {/* Preview */}
        {slots.some((s) => s.enabled) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Schedule Preview</h3>
            <div className="flex flex-wrap gap-2">
              {slots
                .filter((s) => s.enabled)
                .map((s) => (
                  <span key={s.day_of_week} className="bg-green-50 border border-green-100 text-green-700 text-sm px-3 py-1.5 rounded-lg">
                    <strong>{DAYS[s.day_of_week].slice(0, 3)}</strong>{' '}
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </span>
                ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {DAYS.map((day, dow) => {
            const slot = slots[dow]
            return (
              <div
                key={day}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  slot.enabled ? 'border-green-200' : 'border-gray-100'
                }`}
              >
                <div className="p-4 flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={(e) => update(dow, 'enabled', e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          slot.enabled ? 'bg-green-600 border-green-600' : 'border-gray-300'
                        }`}
                      >
                        {slot.enabled && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className={`font-semibold text-base ${slot.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day}
                    </span>
                  </label>

                  {slot.enabled && (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => update(dow, 'start_time', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => update(dow, 'end_time', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 shadow-md shadow-green-100"
            >
              {loading ? 'Saving…' : 'Save Availability'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-6 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
