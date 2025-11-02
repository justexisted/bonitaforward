/**
 * Shared environment variable utilities
 * Standardizes env var access with fallbacks
 */

/**
 * Get environment variable with optional fallback
 */
export function getEnv(name: string, fallbackName?: string): string {
  const v = process.env[name] || (fallbackName ? process.env[fallbackName] : '')
  if (!v) {
    throw new Error(`Missing env ${name}${fallbackName ? ` (or ${fallbackName})` : ''}`)
  }
  return v
}

/**
 * Get environment variable without throwing (returns empty string if missing)
 */
export function getEnvSafe(name: string, fallbackName?: string): string {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : '') || ''
}

/**
 * Get Supabase configuration from environment
 */
export function getSupabaseConfig(): {
  url: string
  serviceRole: string
  anonKey: string
} {
  const url = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const serviceRole = getEnv('SUPABASE_SERVICE_ROLE', 'SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY')
  
  return { url, serviceRole, anonKey }
}

/**
 * Standard CORS headers for Netlify functions
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'Content-Type': 'application/json'
} as const

