import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createBookingRequest, getClientBookings, getAcceptedBookings } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const myBookings = getClientBookings(session.user.id)
  const acceptedBookings = getAcceptedBookings()
  return NextResponse.json({ myBookings, acceptedBookings })
}

export async function POST(request) {
  const session = await getSession()
  if (!session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { date, startTime, endTime, message } = await request.json()

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Date and times are required' }, { status: 400 })
    }

    createBookingRequest({
      clientId: session.user.id,
      date,
      startTime,
      endTime,
      message,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
