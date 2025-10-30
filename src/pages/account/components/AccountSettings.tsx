import { useState, useEffect } from 'react'
import { updateProfile, loadEmailPreferences, updateEmailPreferences } from '../dataLoader'

interface AccountSettingsProps {
  userId: string
  initialEmail: string
  initialName: string
  onMessage: (message: string) => void
}

interface EmailPreferences {
  email_notifications_enabled: boolean
  marketing_emails_enabled: boolean
  email_consent_date: string | null
  email_unsubscribe_date: string | null
}

export function AccountSettings({ userId, initialEmail, initialName, onMessage }: AccountSettingsProps) {
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences | null>(null)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [updatingPrefs, setUpdatingPrefs] = useState(false)

  // Update local state if initialName changes (e.g., after auth refresh)
  useEffect(() => {
    setName(initialName)
  }, [initialName])

  // Load email preferences
  useEffect(() => {
    async function loadPrefs() {
      setLoadingPrefs(true)
      const prefs = await loadEmailPreferences(userId)
      setEmailPrefs(prefs)
      setLoadingPrefs(false)
    }
    loadPrefs()
  }, [userId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (name === initialName) {
      onMessage('No changes to save')
      return
    }
    
    setBusy(true)
    const result = await updateProfile(userId, name)
    
    if (result.success) {
      onMessage('Profile updated successfully!')
      // Reload immediately - auth context now fetches fresh data from database
      setTimeout(() => {
        window.location.reload()
      }, 300)
    } else {
      onMessage(result.error || 'Failed to update profile')
      setBusy(false)
    }
  }

  async function handleEmailPrefChange(field: 'email_notifications_enabled' | 'marketing_emails_enabled', value: boolean) {
    if (!emailPrefs) return
    
    setUpdatingPrefs(true)
    const result = await updateEmailPreferences(userId, {
      [field]: value
    })
    
    if (result.success) {
      setEmailPrefs({
        ...emailPrefs,
        [field]: value,
        email_unsubscribe_date: value ? null : new Date().toISOString()
      })
      
      if (field === 'email_notifications_enabled') {
        onMessage(value ? 'Email notifications enabled' : 'Email notifications disabled')
      } else {
        onMessage(value ? 'Marketing emails enabled' : 'Marketing emails disabled')
      }
    } else {
      onMessage(result.error || 'Failed to update preferences')
    }
    
    setUpdatingPrefs(false)
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Account Settings</h2>
      
      {/* Profile Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Profile Information</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
            <input
              type="email"
              value={initialEmail}
              disabled
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Email Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Preferences</h3>
        <p className="text-sm text-neutral-600 mb-6">
          Manage what emails you receive from Bonita Forward
        </p>

        {loadingPrefs ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : emailPrefs ? (
          <div className="space-y-6">
            {/* Transactional Emails Toggle */}
            <div className="flex items-start justify-between pb-6 border-b border-neutral-200">
              <div className="flex-1 mr-4">
                <div className="flex items-center mb-2">
                  <h4 className="text-sm font-semibold text-neutral-900">
                    Account Notifications
                  </h4>
                  {!emailPrefs.email_notifications_enabled && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Receive important updates about your business listings, change requests, and account activity. 
                  You'll still receive critical security alerts even if disabled.
                </p>
                {emailPrefs.email_unsubscribe_date && !emailPrefs.email_notifications_enabled && (
                  <p className="text-xs text-neutral-500 mt-2">
                    Unsubscribed on {new Date(emailPrefs.email_unsubscribe_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleEmailPrefChange('email_notifications_enabled', !emailPrefs.email_notifications_enabled)}
                disabled={updatingPrefs}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  emailPrefs.email_notifications_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailPrefs.email_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Marketing Emails Toggle */}
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center mb-2">
                  <h4 className="text-sm font-semibold text-neutral-900">
                    Marketing & Newsletters
                  </h4>
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Receive newsletters, promotions, community updates, and tips to grow your business on Bonita Forward.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleEmailPrefChange('marketing_emails_enabled', !emailPrefs.marketing_emails_enabled)}
                disabled={updatingPrefs}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  emailPrefs.marketing_emails_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailPrefs.marketing_emails_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">About Email Preferences</p>
                  <p className="text-blue-800">
                    You can update these preferences anytime. We respect your privacy and will never share your email with third parties.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            Failed to load preferences
          </div>
        )}
      </div>
    </div>
  )
}

