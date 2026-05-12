import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAllBookingRequests } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ requests: await getAllBookingRequests() })
}
