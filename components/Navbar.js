'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Navbar({ user }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/'} className="flex items-center gap-2">
          <span className="text-2xl">🧹</span>
          <span className="font-bold text-gray-900 text-lg">
            Addy<span className="text-green-600">Cleans</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            {user.role === 'admin' ? (
              <>
                <Link href="/admin" className="text-sm text-gray-600 hover:text-green-600 font-medium transition-colors">
                  Dashboard
                </Link>
                <Link href="/admin/availability" className="text-sm text-gray-600 hover:text-green-600 font-medium transition-colors">
                  My Availability
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-green-600 font-medium transition-colors">
                  Dashboard
                </Link>
                <Link href="/availability" className="text-sm text-gray-600 hover:text-green-600 font-medium transition-colors">
                  My Availability
                </Link>
                <Link href="/book" className="text-sm text-gray-600 hover:text-green-600 font-medium transition-colors">
                  Book
                </Link>
              </>
            )}

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:block">{user.name.split(' ')[0]}</span>
                {user.role === 'admin' && (
                  <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full hidden sm:block">Admin</span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg py-2 min-w-40 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
