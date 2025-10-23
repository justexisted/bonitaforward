import { useState } from 'react'
import { updateProfile } from '../dataLoader'

interface AccountSettingsProps {
  userId: string
  initialEmail: string
  initialName: string
  onMessage: (message: string) => void
}

export function AccountSettings({ userId, initialEmail, initialName, onMessage }: AccountSettingsProps) {
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    setBusy(true)
    const result = await updateProfile(userId, name)
    
    if (result.success) {
      onMessage('Profile updated successfully!')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      onMessage(result.error || 'Failed to update profile')
    }
    
    setBusy(false)
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Account Settings</h2>
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
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
    </div>
  )
}

