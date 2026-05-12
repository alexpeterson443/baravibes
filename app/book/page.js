'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { format, addDays, isBefore, startOfToday } from 'date-fns'

function generateTimeSlots(startTime, endTime) {
  const slots = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  let h = startH
  let m = startM

  while (h < endH || (h === endH && m < endM)) {
    const slotStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    let nh = h
    let nm = m + 60
    if (nm >= 60) { nh += 1; nm -= 60 }
    const slotEnd = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
    if (nh < endH || (nh === endH && nm <= endM)) {
      slots.push({ start: slotStart, end: slotEnd })
    }
    h = nh
    m = nm
  }
  return slots
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [adminAvailability, setAdminAvailability] = useState([])
  const [acceptedBookings, setAcceptedBookings] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { router.push('/login'); return }
        if (d.user.role === 'admin') { router.push('/admin'); return }
        setUser(d.user)
      })
    fetch('/api/availability')
      .then((r) => r.json())
      .then((d) => {
        setAdminAvailability(d.adminAvailability || [])
        setAcceptedBookings(d.acceptedBookings || [])
      })
  }, [router])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd')

  const dayOfWeek = selectedDate ? new Date(selectedDate + 'T00:00:00').getDay() : null
  const adminSlot = dayOfWeek !== null ? adminAvailability.find((s) => s.day_of_week === dayOfWeek) : null

  const bookedSlots = selectedDate
    ? acceptedBookings
        .filter((b) => b.requested_date === selectedDate)
        .map((b) => b.start_time)
    : []

  const availableSlots = adminSlot ? generateTimeSlots(adminSlot.start_time, adminSlot.end_time) : []
  const openSlots = availableSlots.filter((s) => !bookedSlots.includes(s.start))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) {
      setError('Please select a date and time slot.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          message,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to submit request')
        return
      }

      setSuccess(true)
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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Sent!</h2>
          <p className="text-gray-500 mb-2">
            Your booking request for{' '}
            <strong>{format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d')}</strong> at{' '}
            <strong>{formatTime(selectedSlot.start)}</strong> has been submitted.
          </p>
          <p className="text-gray-400 text-sm mb-8">Addy will review and confirm your request shortly.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(false); setSelectedDate(''); setSelectedSlot(null); setMessage('') }}
              className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Book another
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Request a Booking</h1>
          <p className="text-gray-500 mt-1">Pick a date and time for your cleaning session.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date picker */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <label className="block text-base font-semibold text-gray-900 mb-3">
              1. Choose a date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={todayStr}
              max={maxDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null) }}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-auto"
            />

            {selectedDate && !adminSlot && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <span>⚠️</span>
                <span>Addy is not available on that day. Please pick a different date.</span>
              </div>
            )}
          </div>

          {/* Time slot picker */}
          {selectedDate && adminSlot && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <label className="block text-base font-semibold text-gray-900 mb-1">
                2. Choose a time slot
              </label>
              <p className="text-sm text-gray-500 mb-4">
                Addy is available {formatTime(adminSlot.start_time)} – {formatTime(adminSlot.end_time)}
              </p>

              {openSlots.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                  No open slots on this day. Try a different date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot.start)
                    const isSelected = selectedSlot?.start === slot.start
                    return (
                      <button
                        key={slot.start}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                          isBooked
                            ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        {formatTime(slot.start)}
                        {isBooked && <div className="text-xs text-gray-400">Taken</div>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {selectedSlot && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <label className="block text-base font-semibold text-gray-900 mb-1">
                3. Add a note <span className="text-gray-400 font-normal text-sm">(optional)</span>
              </label>
              <p className="text-sm text-gray-500 mb-3">Any special instructions for Addy?</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='e.g. "Focus on the kitchen and bathrooms please!"'
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />

              {/* Summary */}
              <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Booking Summary</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedSlot && (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 shadow-md shadow-green-100"
              >
                {loading ? 'Sending request…' : 'Send Booking Request'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 bg-white border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
