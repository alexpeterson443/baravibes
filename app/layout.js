import './globals.css'

export const metadata = {
  title: "Addy's Cleaning & Organization",
  description: 'Professional home cleaning and organization services',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
