import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAdminAvailability, setAdminAvailability } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ slots: getAdminAvailability() })
}

export async function POST(request) {
  const session = await getSession()
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { slots } = await request.json()
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }
    setAdminAvailability(slots)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
