import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAllClients, getClientAvailabilityForWeek } from '@/lib/db'

export async function GET(request) {
  const session = await getSession()
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('weekStart')

  const clients = getAllClients()
  const availability = weekStart ? getClientAvailabilityForWeek(weekStart) : []

  return NextResponse.json({ clients, availability })
}
