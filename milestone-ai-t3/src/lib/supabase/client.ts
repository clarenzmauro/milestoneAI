import { createClient } from '@supabase/supabase-js'
import { env } from '@/env'

export const createSupabaseClient = () => {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-application-name': 'milestone-ai',
        },
      },
    }
  )
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>
