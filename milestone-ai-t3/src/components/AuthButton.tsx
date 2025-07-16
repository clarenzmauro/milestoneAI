'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export function AuthButton() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <button
        disabled
        className="rounded-md bg-gray-600 px-6 py-3 text-sm font-semibold text-white shadow-sm"
      >
        Loading...
      </button>
    )
  }

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
      >
        Dashboard
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      Sign In
    </Link>
  )
}
