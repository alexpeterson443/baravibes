import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'addy-cleaning-super-secret-key-at-least-32-chars!!',
  cookieName: 'addy_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}

export async function getSession() {
  const session = await getIronSession(cookies(), sessionOptions)
  return session
}
