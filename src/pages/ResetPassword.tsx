import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [validRecovery, setValidRecovery] = useState(false)

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // Check URL parameters
        const params = new URLSearchParams(location.search)
        const type = params.get('type')
        const accessToken = params.get('access_token')
        
        // Also check hash parameters (common for OAuth flows)
        const hashParams = new URLSearchParams(location.hash.substring(1))
        const hashType = hashParams.get('type')
        const hashAccessToken = hashParams.get('access_token')

        console.log('Reset password page - URL params:', { type, accessToken: !!accessToken })
        console.log('Reset password page - Hash params:', { hashType, hashAccessToken: !!hashAccessToken })

        if ((type === 'recovery' && accessToken) || (hashType === 'recovery' && hashAccessToken)) {
          console.log('Valid recovery session detected')
          setValidRecovery(true)
        } else {
          // Check if user has an active session (might be from email link)
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('Active session found, allowing password reset')
            setValidRecovery(true)
          } else {
            console.log('No valid recovery session or active session')
            setValidRecovery(false)
          }
        }
      } catch (error) {
        console.error('Error checking recovery session:', error)
        setValidRecovery(false)
      }
    }

    checkRecoverySession()
  }, [location.search, location.hash])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!password || password.length < 8) { setMessage('Use at least 8 characters.'); return }
    if (password !== confirm) { setMessage('Passwords do not match'); return }
    setBusy(true)
    try {
      console.log('Updating password...')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { 
        console.error('Password update error:', error)
        setMessage(error.message)
        return 
      }
      console.log('Password updated successfully')
      setMessage('Password updated successfully! You will be redirected to sign in.')
      
      // Wait a moment for user to see success message, then sign out and redirect
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate('/signin', { replace: true })
      }, 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="py-10">
      <div className="container-px mx-auto max-w-md">
        <div className="rounded-2xl border border-neutral-100 p-6 bg-white elevate">
          <h1 className="text-xl font-semibold tracking-tight text-center">Set a new password</h1>
          {message && <div className="mt-2 text-sm text-red-600 text-center">{message}</div>}
          {validRecovery ? (
          <form onSubmit={handleUpdate} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm text-neutral-600">New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" placeholder="••••••••" />
            </div>
            <button disabled={busy} className="w-full rounded-full bg-neutral-900 text-white py-2.5 elevate">{busy ? 'Saving…' : 'Update Password'}</button>
          </form>
          ) : (
            <div className="mt-4 text-sm text-neutral-600 text-center">
              This link is invalid or has expired. Please request a new password reset link.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}


