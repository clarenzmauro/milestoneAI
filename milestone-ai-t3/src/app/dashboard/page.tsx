'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={signOut}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Sign Out
          </button>
        </div>
        
        <div className="mt-8">
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Welcome to Milestone AI
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                You're signed in as {user.email}
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">User ID</h4>
                  <p className="mt-1 text-sm text-gray-600">{user.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Email</h4>
                  <p className="mt-1 text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
