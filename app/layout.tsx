import './globals.css'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import AuthContext from './context/AuthContext'

export const metadata: Metadata = {
  title: 'Milestone.AI',
  description: 'AI-powered goal planning and tracking application',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <AuthContext>
          {children}
        </AuthContext>
      </body>
    </html>
  )
} 