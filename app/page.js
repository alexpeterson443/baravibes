import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const session = await getSession()
  if (session.user) {
    redirect(session.user.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <div className="min-h-screen">
      <Navbar user={null} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-40" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-40" />

        <div className="relative max-w-6xl mx-auto px-4 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
              ✨ Professional Cleaning & Organization
            </div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
              A Clean Home Is a
              <br />
              <span className="text-green-600">Happy Home</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Addy brings professional cleaning and organizing to your doorstep. Set your schedule,
              request a session, and come home to a spotless space.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-md shadow-green-200"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="bg-white text-gray-700 px-8 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Mock UI card */}
          <div className="hidden md:block">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-green-100 max-w-sm ml-auto">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                <div className="flex-1 bg-gray-100 h-4 rounded-full ml-2" />
              </div>
              <div className="space-y-3">
                <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3 border border-green-100">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                    🏠
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-800 text-sm">Next Cleaning</div>
                    <div className="text-xs text-gray-500">Saturday, 10:00 AM</div>
                  </div>
                  <span className="ml-auto bg-green-600 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                    Confirmed
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 border border-gray-100">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                    📅
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Availability Set</div>
                    <div className="text-xs text-gray-500">Mon, Wed, Fri • 9AM–5PM</div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3 border border-blue-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                    ⏳
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Pending Request</div>
                    <div className="text-xs text-gray-500">Tuesday, 2:00 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              A smart scheduling system built specifically for Addy's cleaning and organization service.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '📋',
                title: 'Set Your Availability',
                desc: 'Tell Addy when you\'re home each week. Add notes for conflicts like "only till 2pm on Saturday."',
              },
              {
                icon: '📆',
                title: 'Request a Session',
                desc: 'Pick a time from Addy\'s open schedule and send a booking request with a note.',
              },
              {
                icon: '✅',
                title: 'Instant Confirmation',
                desc: 'Addy reviews and accepts your request. Confirmed bookings appear on the shared calendar.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-8 hover:shadow-md transition-shadow border border-gray-100">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-green-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-14">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create an account', desc: 'Sign up in seconds with your name and email.' },
              { step: '2', title: 'Submit your availability', desc: "Each week, let Addy know when you're free and any scheduling conflicts." },
              { step: '3', title: 'Book your cleaning', desc: "Pick a time that works, send a request, and Addy will confirm it." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-green-200">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <Link
              href="/register"
              className="bg-green-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
            >
              Book Your First Cleaning
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-2xl">🧹</span>
          <span className="text-white font-bold text-lg">AddyCleans</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} AddyCleans. All rights reserved.</p>
      </footer>
    </div>
  )
}
