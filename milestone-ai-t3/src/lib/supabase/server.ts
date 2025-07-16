import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/env'

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

export const createSupabaseServiceClient = () => {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-application-name': 'milestone-ai',
        },
      },
    }
  )
}

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>
export type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>
