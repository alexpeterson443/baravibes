import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { setClientAvailability, getMyAvailabilityForWeek, getAdminAvailability, getAcceptedBookings } from '@/lib/db'

export async function GET(request) {
  const session = await getSession()
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')

  if (weekStart) {
    const mySlots = getMyAvailabilityForWeek(session.user.id, weekStart)
    return NextResponse.json({ slots: mySlots })
  }

  const adminAvailability = getAdminAvailability()
  const acceptedBookings = getAcceptedBookings()
  return NextResponse.json({ adminAvailability, acceptedBookings })
}

export async function POST(request) {
  const session = await getSession()
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { weekStart, slots } = await request.json()

    if (!weekStart || !Array.isArray(slots)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    setClientAvailability(session.user.id, weekStart, slots)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
