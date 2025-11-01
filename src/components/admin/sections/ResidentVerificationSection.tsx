import { useMemo } from 'react'
import type { ProfileRow } from '../../../types/admin'

interface ResidentVerificationSectionProps {
  profiles: ProfileRow[]
}

/**
 * ResidentVerificationSection
 * 
 * Displays statistics and details about Bonita resident verification:
 * - Total users who are verified residents
 * - Breakdown by verification method
 * - ZIP code distribution
 * - List of verified residents with details
 */
export function ResidentVerificationSection({
  profiles
}: ResidentVerificationSectionProps) {
  // Debug: Log profiles count to help diagnose empty section
  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-100 p-6 bg-white">
        <div className="text-center">
          <div className="text-lg font-medium text-neutral-700 mb-2">No profiles loaded</div>
          <div className="text-sm text-neutral-500">
            Profiles data is empty. This could mean:
            <ul className="list-disc list-inside mt-2 text-left max-w-md mx-auto">
              <li>No users have signed up yet</li>
              <li>There was an error loading profile data</li>
              <li>The database query didn't return any results</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUsers = profiles.length
    const verifiedResidents = profiles.filter(p => p.is_bonita_resident === true)
    const verifiedCount = verifiedResidents.length
    
    // Breakdown by verification method
    const byMethod: Record<string, number> = {}
    verifiedResidents.forEach(p => {
      const method = p.resident_verification_method || 'unknown'
      byMethod[method] = (byMethod[method] || 0) + 1
    })
    
    // ZIP code distribution
    const zipCodes: Record<string, number> = {}
    verifiedResidents.forEach(p => {
      const zip = p.resident_zip_code
      if (zip) {
        zipCodes[zip] = (zipCodes[zip] || 0) + 1
      }
    })
    
    // Sort ZIP codes by count (descending)
    const sortedZips = Object.entries(zipCodes)
      .sort((a, b) => b[1] - a[1])
    
    return {
      totalUsers,
      verifiedCount,
      verifiedPercentage: totalUsers > 0 ? ((verifiedCount / totalUsers) * 100).toFixed(1) : '0',
      byMethod,
      zipCodes: sortedZips,
      verifiedResidents: verifiedResidents.sort((a, b) => {
        // Sort by verification date (most recent first), then by email
        const dateA = a.resident_verified_at ? new Date(a.resident_verified_at).getTime() : 0
        const dateB = b.resident_verified_at ? new Date(b.resident_verified_at).getTime() : 0
        if (dateB !== dateA) return dateB - dateA
        return (a.email || '').localeCompare(b.email || '')
      })
    }
  }, [profiles])

  // Format verification method for display
  const formatMethod = (method: string | null | undefined): string => {
    if (!method) return 'Not verified'
    return method.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
          <div className="text-sm text-neutral-500 mb-1">Total Users</div>
          <div className="text-2xl font-semibold">{stats.totalUsers}</div>
        </div>
        
        <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
          <div className="text-sm text-neutral-500 mb-1">Verified Residents</div>
          <div className="text-2xl font-semibold text-green-700">{stats.verifiedCount}</div>
          <div className="text-xs text-neutral-500 mt-1">
            {stats.verifiedPercentage}% of total users
          </div>
        </div>
        
        <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
          <div className="text-sm text-neutral-500 mb-1">Non-Residents</div>
          <div className="text-2xl font-semibold text-neutral-600">
            {stats.totalUsers - stats.verifiedCount}
          </div>
        </div>
      </div>

      {/* Verification Method Breakdown */}
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
        <div className="font-medium mb-3">Verification Method Breakdown</div>
        <div className="space-y-2">
          {Object.entries(stats.byMethod).length === 0 ? (
            <div className="text-sm text-neutral-500">No verified residents yet</div>
          ) : (
            Object.entries(stats.byMethod)
              .sort((a, b) => b[1] - a[1])
              .map(([method, count]) => (
                <div key={method} className="flex items-center justify-between text-sm">
                  <span>{formatMethod(method)}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* ZIP Code Distribution */}
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
        <div className="font-medium mb-3">ZIP Code Distribution</div>
        <div className="space-y-2">
          {stats.zipCodes.length === 0 ? (
            <div className="text-sm text-neutral-500">No ZIP codes recorded</div>
          ) : (
            stats.zipCodes.map(([zip, count]) => (
              <div key={zip} className="flex items-center justify-between text-sm">
                <span className="font-mono">{zip}</span>
                <span className="font-medium">{count} {count === 1 ? 'user' : 'users'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verified Residents List */}
      <div className="rounded-2xl border border-neutral-100 p-4 bg-white">
        <div className="font-medium mb-3">
          Verified Residents ({stats.verifiedCount})
        </div>
        <div className="space-y-3">
          {stats.verifiedResidents.length === 0 ? (
            <div className="text-sm text-neutral-500">No verified residents found</div>
          ) : (
            stats.verifiedResidents.map((profile) => (
              <div 
                key={profile.id} 
                className="flex items-start justify-between py-2 border-b border-neutral-100 last:border-0"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{profile.email || '(no email)'}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {profile.name || '—'}
                    {profile.resident_zip_code && (
                      <span className="ml-2 font-mono">• ZIP: {profile.resident_zip_code}</span>
                    )}
                    {profile.resident_verification_method && (
                      <span className="ml-2">
                        • {formatMethod(profile.resident_verification_method)}
                      </span>
                    )}
                  </div>
                  {profile.resident_verified_at && (
                    <div className="text-xs text-neutral-400 mt-1">
                      Verified: {new Date(profile.resident_verified_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    Verified Resident
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

