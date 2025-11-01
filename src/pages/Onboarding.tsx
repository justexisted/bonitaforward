import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyByZipCode, verifyBySelfDeclaration, type VerificationMethod } from '../utils/residentVerification'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'business' | 'community' | ''>('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  // Bonita resident verification fields
  const [zipCode, setZipCode] = useState('')
  const [isBonitaResident, setIsBonitaResident] = useState(false)

  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        // Handle OAuth callback if present
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        
        if (accessToken) {
          console.log('OAuth callback detected, processing...')
          // Let Supabase handle the OAuth session
          await new Promise(resolve => setTimeout(resolve, 1000)) // Give time for session to be established
        }

        // Check for session
        const { data } = await supabase.auth.getSession()
        
        if (!data.session?.user?.email) {
          console.log('No session found, redirecting to signin')
          navigate('/signin', { replace: true })
        } else {
          console.log('Session found for:', data.session.user.email)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing onboarding:', error)
        navigate('/signin', { replace: true })
      }
    }

    initializeOnboarding()
  }, [navigate])

  if (loading) {
    return (
      <section className="py-10">
        <div className="container-px mx-auto max-w-md">
          <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
              <p className="mt-4 text-neutral-600">Setting up your account...</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!role) { setMessage('Choose account type'); return }
    if (!password || password.length < 8) { setMessage('Use at least 8 characters'); return }
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    setBusy(true)
    try {
      // Set password
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) { setMessage(pwErr.message); return }
      
      // Handle Bonita resident verification
      let verificationResult: {
        is_bonita_resident: boolean
        resident_verification_method: VerificationMethod | null
        resident_zip_code: string | null
        resident_verified_at: string | null
      } = {
        is_bonita_resident: false,
        resident_verification_method: null,
        resident_zip_code: null,
        resident_verified_at: null
      }

      if (isBonitaResident) {
        if (zipCode.trim()) {
          // Try ZIP code verification first
          const zipResult = verifyByZipCode(zipCode)
          if (zipResult.isBonitaResident) {
            verificationResult = {
              is_bonita_resident: true,
              resident_verification_method: 'zip-verified',
              resident_zip_code: zipResult.zipCode,
              resident_verified_at: zipResult.verifiedAt || new Date().toISOString()
            }
          } else {
            // ZIP code invalid, fall back to self-declaration
            const selfResult = verifyBySelfDeclaration(zipCode)
            verificationResult = {
              is_bonita_resident: true,
              resident_verification_method: 'self-declared',
              resident_zip_code: selfResult.zipCode,
              resident_verified_at: selfResult.verifiedAt || new Date().toISOString()
            }
          }
        } else {
          // Self-declaration only (no ZIP code provided)
          const selfResult = verifyBySelfDeclaration()
          verificationResult = {
            is_bonita_resident: true,
            resident_verification_method: 'self-declared',
            resident_zip_code: null,
            resident_verified_at: selfResult.verifiedAt || new Date().toISOString()
          }
        }
      }

      // Set role and resident verification in profile
      // CRITICAL FIX: Use separate INSERT/UPDATE instead of upsert to avoid RLS 403 errors
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id
      const email = sess.session?.user?.email
      if (userId && email) {
        // Check if profile already exists to avoid RLS issues with upsert
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()
        
        const updatePayload: any = {
          email,
          role,
          ...verificationResult
        }
        
        if (existingProfile) {
          // Profile exists - use UPDATE
          await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', userId)
        } else {
          // Profile doesn't exist - use INSERT
          await supabase
            .from('profiles')
            .insert({
              id: userId,
              ...updatePayload
            })
        }
      }
      
      // Redirect to saved location or appropriate default
      const savedUrl = (() => {
        try { return localStorage.getItem('bf-return-url') } catch { return null }
      })()
      try { localStorage.removeItem('bf-return-url') } catch {}

      const target = savedUrl || (role === 'business' ? '/business' : '/')
      navigate(target, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="py-10">
      <div className="container-px mx-auto max-w-md">
        <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
          <h1 className="text-xl font-semibold tracking-tight text-center">Complete your account</h1>
          {message && <div className="mt-2 text-sm text-red-600 text-center">{message}</div>}
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-neutral-600">Account Type</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 bg-white">
                <option value="">Select…</option>
                <option value="business">I have a business</option>
                <option value="community">I am a community member</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Set Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>

            {/* Bonita Resident Verification */}
            <div className="pt-2 border-t border-neutral-200">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  id="is-bonita-resident"
                  checked={isBonitaResident}
                  onChange={(e) => setIsBonitaResident(e.target.checked)}
                  className="mt-1 w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-500"
                />
                <label htmlFor="is-bonita-resident" className="text-sm text-neutral-700 cursor-pointer">
                  I am a Bonita resident
                </label>
              </div>
              
              {isBonitaResident && (
                <div className="ml-7 mb-3">
                  <label className="block text-sm text-neutral-600 mb-1">
                    ZIP Code (optional)
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="91902"
                    maxLength={10}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Valid Bonita ZIP codes: 91902, 91908, 91909
                  </p>
                </div>
              )}
            </div>

            <button disabled={busy} className="w-full rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Finish'}</button>
          </form>
        </div>
      </div>
    </section>
  )
}


