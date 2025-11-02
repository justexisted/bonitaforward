/**
 * DEPENDENCY TRACKING
 *
 * WHAT THIS DEPENDS ON:
 * - Supabase auth (../lib/supabase): Provides session management and password updates
 *   → CRITICAL: Must have valid session before allowing onboarding
 *   → CRITICAL: Must have session.user.email and session.user.id for profile updates
 *   → CRITICAL: Password update via supabase.auth.updateUser() must succeed
 * - profileUtils (updateUserProfile, getNameFromMultipleSources): Centralized profile update utility
 *   → CRITICAL: updateUserProfile() ensures ALL fields (name, email, role, resident verification) are saved
 *   → CRITICAL: getNameFromMultipleSources() retrieves name from localStorage or auth metadata
 *   → CRITICAL: If profileUtils breaks, profile updates fail and incomplete profiles are saved
 * - localStorage ('bf-pending-profile'): Stores signup data temporarily during signup flow
 *   → CRITICAL: Must contain name, email, role if user came from SignIn.tsx
 *   → CRITICAL: Key must match 'bf-pending-profile' (used by SignIn.tsx and profileUtils)
 * - localStorage ('bf-return-url'): Stores redirect URL after onboarding
 *   → CRITICAL: If present, redirects to saved URL after completion
 *   → CRITICAL: Must be removed after use to prevent stale redirects
 * - residentVerification utils (verifyByZipCode, verifyBySelfDeclaration): Resident verification logic
 *   → CRITICAL: Must return valid verification results matching VerificationMethod type
 *   → CRITICAL: ZIP codes must match expected Bonita ZIP codes (91902, 91908, 91909)
 * - React Router (useNavigate): Navigation after onboarding completion
 *   → CRITICAL: Redirects to '/signin' if no session, or to saved URL/role-based URL after completion
 *
 * WHAT DEPENDS ON THIS:
 * - SignIn.tsx → Onboarding.tsx flow: Business account signup depends on this page
 *   → CRITICAL: If onboarding fails, business users can't complete signup
 *   → CRITICAL: If profile isn't saved correctly, admin panel shows incomplete data
 * - App.tsx routing: '/onboarding' route renders this page
 *   → CRITICAL: If this page breaks, onboarding flow is blocked
 * - AuthContext.tsx (indirect): Depends on profile data saved here
 *   → CRITICAL: Profile saved here is displayed in auth.name, auth.role
 *   → CRITICAL: If profile is incomplete, auth context shows missing data
 * - Admin panel (indirect): Displays profiles saved during onboarding
 *   → CRITICAL: If name/role/resident verification isn't saved, admin sees incomplete profiles
 *
 * BREAKING CHANGES:
 * - If you change profileUtils.updateUserProfile() API → Profile updates fail
 * - If you change localStorage key ('bf-pending-profile') → Name can't be retrieved
 * - If you change residentVerification API → Verification data format breaks
 * - If you change password requirements → Validation fails
 * - If you change redirect logic → Users land on wrong page after onboarding
 * - If you remove name retrieval → Profiles saved without name (admin shows "No name provided")
 *
 * HOW TO SAFELY UPDATE:
 * 1. Check ALL dependencies: grep -r "updateUserProfile\|getNameFromMultipleSources\|verifyByZipCode\|verifyBySelfDeclaration" src/
 * 2. Verify localStorage keys match: 'bf-pending-profile' and 'bf-return-url'
 * 3. Test complete signup flow: SignIn.tsx → Onboarding.tsx → Admin panel
 * 4. Test business account signup (name, role, password must be saved)
 * 5. Test community account signup (name, role, password must be saved)
 * 6. Test resident verification (all verification fields must be saved)
 * 7. Test OAuth signup flow (auth metadata must provide name)
 * 8. Test redirect logic (saved URL, role-based URL, default URL)
 * 9. Verify admin panel shows complete profile data after onboarding
 * 10. Check console for validation warnings during profile updates
 *
 * RELATED FILES:
 * - src/pages/SignIn.tsx: Saves data to localStorage ('bf-pending-profile') before redirecting here
 * - src/utils/profileUtils.ts: Provides updateUserProfile() and getNameFromMultipleSources()
 * - src/utils/residentVerification.ts: Provides verifyByZipCode() and verifyBySelfDeclaration()
 * - src/contexts/AuthContext.tsx: Displays profile data saved during onboarding
 * - src/pages/Admin.tsx: Shows profiles saved during onboarding in admin panel
 * - src/App.tsx: Routes '/onboarding' to this page
 * - docs/prevention/DATA_INTEGRITY_PREVENTION.md: Prevention guide for missing fields
 *
 * RECENT BREAKS:
 * - Missing name during business signup (2025-01-XX): Wasn't using updateUserProfile()
 *   → Fix: Updated to use updateUserProfile() and getNameFromMultipleSources()
 *   → Lesson: Always use profileUtils for profile updates to ensure field completeness
 * - Incomplete profiles in admin panel: Missing name, role, or resident verification
 *   → Fix: Use updateUserProfile() to ensure ALL fields are included
 *   → Lesson: Centralized profile updates prevent missing fields
 *
 * See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
 * See: docs/prevention/CASCADING_FAILURES.md
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { verifyByZipCode, verifyBySelfDeclaration, type VerificationMethod } from '../utils/residentVerification'
import { updateUserProfile, getNameFromMultipleSources } from '../utils/profileUtils'

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
      // CRITICAL: Use shared updateUserProfile utility to ensure ALL fields are saved
      // This prevents missing fields like name from being omitted
      // See: docs/prevention/DATA_INTEGRITY_PREVENTION.md
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user?.id
      const email = sess.session?.user?.email
      if (userId && email) {
        // Get name from multiple sources (localStorage, auth metadata)
        const name = await getNameFromMultipleSources(email, sess.session?.user)
        
        // Read email preferences from localStorage (bf-pending-profile)
        let emailPreferences: {
          email_notifications_enabled?: boolean
          marketing_emails_enabled?: boolean
        } = {}
        
        try {
          const raw = localStorage.getItem('bf-pending-profile')
          if (raw) {
            const pref = JSON.parse(raw) as {
              email_notifications_enabled?: boolean
              marketing_emails_enabled?: boolean
            }
            if (pref.email_notifications_enabled !== undefined) {
              emailPreferences.email_notifications_enabled = pref.email_notifications_enabled
            }
            if (pref.marketing_emails_enabled !== undefined) {
              emailPreferences.marketing_emails_enabled = pref.marketing_emails_enabled
            }
          }
        } catch {
          // localStorage access failed, continue without email preferences
        }
        
        // Use shared utility to update profile
        // This ensures ALL fields (name, email, role, resident verification, email preferences) are included
        const result = await updateUserProfile(
          userId,
          {
            email,
            name,
            role,
            ...verificationResult,
            ...emailPreferences
          },
          'onboarding'
        )
        
        if (!result.success) {
          console.error('[Onboarding] Failed to update profile:', result.error)
          // Don't fail the flow, but log error for debugging
        } else {
          // If email preferences were set during signup, also set email_consent_date
          // This tracks when user consented to receive emails
          if (emailPreferences.email_notifications_enabled === true || emailPreferences.marketing_emails_enabled === true) {
            try {
              const { error: consentError } = await supabase
                .from('profiles')
                .update({ email_consent_date: new Date().toISOString() })
                .eq('id', userId)
              
              if (consentError) {
                console.warn('[Onboarding] Failed to set email_consent_date:', consentError)
                // Don't fail the flow, but log warning
              }
            } catch (err) {
              console.warn('[Onboarding] Exception setting email_consent_date:', err)
            }
          }
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


