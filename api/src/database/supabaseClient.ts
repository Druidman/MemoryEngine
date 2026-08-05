
import { getCookie, setCookie } from 'hono/cookie'
import { createServerClient } from '@supabase/ssr'
import { Context } from 'hono'

export function createClient(c: Context) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          // parse all cookies from the request
          return Object.entries(getCookie(c)).map(([name, value]) => ({ name, value }))
        },
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            const { sameSite, encode, ...rest } = options ?? {}
            const sameSiteValue = typeof sameSite === 'string' ? sameSite : undefined
            setCookie(c, name, value, { ...rest, sameSite: sameSiteValue })
          })
        },
      },
    }
  )
}