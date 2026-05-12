'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { format, startOfWeek, addDays, addWeeks } from 'date-fns'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// day_of_week mapping: Monday=1, Tuesday=2, ..., Sunday=0
const DOW_MAP = [1, 2, 3, 4, 5, 6, 0]

const defaultSlot = () => ({ available: false, start_time: '09:00', end_time: '17:00', conflict_notes: '' })

export default function AvailabilityPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState(DAYS.map(defaultSlot))
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const weekStart = format(startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(addDays(startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 6), 'MMM d, yyyy')
  const weekStartDisplay = format(startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), 'MMM d')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.push('/login'); return }
        if (d.user.role === 'admin') { router.push('/admin'); return }
        setUser(d.user)
      })
  }, [router])

  useEffect(() => {
    fetch(`/api/availability?weekStart=${weekStart}`)
      .then((r) => r.json())
      .then((d) => {
        const newSlots = DAYS.map(defaultSlot)
        for (const s of d.slots || []) {
          const idx = DOW_MAP.indexOf(s.day_of_week)
          if (idx >= 0) {
            newSlots[idx] = {
              available: true,
              start_time: s.start_time,
              end_time: s.end_time,
              conflict_notes: s.conflict_notes || '',
            }
          }
        }
        setSlots(newSlots)
      })
  }, [weekStart])

  function updateSlot(i, field, value) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)

    const activeSlots = slots
      .map((s, i) => ({ ...s, day_of_week: DOW_MAP[i] }))
      .filter((s) => s.available)

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, slots: activeSlots }),
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
          <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
          <p className="text-gray-500 mt-1">
            Let Addy know when you&apos;re home and available for a cleaning session.
          </p>
        </div>

        {/* Week selector */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            ←
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Next week' : `In ${weekOffset} weeks`}
            </div>
            <div className="text-sm text-gray-500">
              {weekStartDisplay} – {weekEnd}
            </div>
          </div>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            →
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-100 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
            ✅ Availability saved for {weekStartDisplay} – {weekEnd}!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {DAYS.map((day, i) => (
            <div
              key={day}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                slots[i].available ? 'border-green-200' : 'border-gray-100'
              }`}
            >
              <div className="p-4 flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={slots[i].available}
                      onChange={(e) => updateSlot(i, 'available', e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        slots[i].available ? 'bg-green-600 border-green-600' : 'border-gray-300'
                      }`}
                    >
                      {slots[i].available && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className={`font-semibold text-base ${slots[i].available ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day}
                  </span>
                </label>

                {slots[i].available && (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={slots[i].start_time}
                      onChange={(e) => updateSlot(i, 'start_time', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={slots[i].end_time}
                      onChange={(e) => updateSlot(i, 'end_time', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>

              {slots[i].available && (
                <div className="px-4 pb-4">
                  <input
                    type="text"
                    value={slots[i].conflict_notes}
                    onChange={(e) => updateSlot(i, 'conflict_notes', e.target.value)}
                    placeholder='Any conflicts? e.g. "Only until 2pm, I have a pickup at 2:30"'
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}
            </div>
          ))}

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
              onClick={() => router.push('/dashboard')}
              className="px-6 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
