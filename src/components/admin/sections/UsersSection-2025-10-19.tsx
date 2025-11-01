import React from 'react'

interface UsersSectionProps {
  profiles: Array<{
    id: string
    email: string | null
    name: string | null
    role?: string | null
    is_bonita_resident?: boolean | null
    resident_zip_code?: string | null
    resident_verification_method?: string | null
  }>
  deletingUserId: string | null
  currentUserEmail: string | null
  onSetDeletingUserId: (userId: string | null) => void
  onDeleteUser: (userId: string) => Promise<void>
}

export const UsersSection: React.FC<UsersSectionProps> = ({
  profiles,
  deletingUserId,
  currentUserEmail,
  onSetDeletingUserId,
  onDeleteUser
}) => {
  const businessOwners = profiles.filter((p) => (p.role || 'community') === 'business')
  const regularUsers = profiles.filter((p) => (p.role || 'community') !== 'business')

  return (
    <>
      {/* Business Owners Section */}
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
        <div className="font-medium">Business Owners</div>
        <div className="mt-2 text-sm">
          {businessOwners.length === 0 && (
            <div className="text-neutral-500">No business owners found.</div>
          )}
          {businessOwners.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
              <div>
                <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                <div className="text-xs text-neutral-500">
                  {p.name || '—'} • business
                  {p.is_bonita_resident && (
                    <span className="ml-2 text-green-600">• Verified Resident</span>
                  )}
                  {p.resident_zip_code && (
                    <span className="ml-2 font-mono">• {p.resident_zip_code}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deletingUserId === p.id ? (
                  <>
                    <button 
                      onClick={() => onDeleteUser(p.id)} 
                      className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => onSetDeletingUserId(null)} 
                      className="text-xs underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => onSetDeletingUserId(p.id)} 
                    className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regular Users Section */}
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
        <div className="font-medium">Users</div>
        <div className="mt-2 text-sm">
          {regularUsers.length === 0 && (
            <div className="text-neutral-500">No users found.</div>
          )}
          {regularUsers.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1 border-b border-neutral-100 last:border-0">
              <div>
                <div className="font-medium text-sm">{p.email || '(no email)'}</div>
                <div className="text-xs text-neutral-500">
                  {p.name || '—'}
                  {p.role ? ` • ${p.role}` : ''}
                  {p.is_bonita_resident && (
                    <span className="ml-2 text-green-600">• Verified Resident</span>
                  )}
                  {p.resident_zip_code && (
                    <span className="ml-2 font-mono">• {p.resident_zip_code}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {deletingUserId === p.id ? (
                  <>
                    <button 
                      onClick={() => onDeleteUser(p.id)} 
                      className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => onSetDeletingUserId(null)} 
                      className="text-xs underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => onSetDeletingUserId(p.id)} 
                    disabled={currentUserEmail?.toLowerCase() === (p.email || '').toLowerCase()}
                    className="rounded-full bg-neutral-100 text-neutral-900 px-3 py-1.5 border border-neutral-200 text-xs disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

