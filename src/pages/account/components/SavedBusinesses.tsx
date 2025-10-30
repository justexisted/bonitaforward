import { Heart } from 'lucide-react'
import type { SavedBusiness } from '../types'
import { unsaveBusiness } from '../dataLoader'

interface SavedBusinessesProps {
  businesses: SavedBusiness[]
  loading: boolean
  onBusinessRemoved: (savedId: string) => void
  onMessage: (message: string) => void
}

export function SavedBusinesses({ businesses, loading, onBusinessRemoved, onMessage }: SavedBusinessesProps) {
  async function handleRemove(savedId: string) {
    const result = await unsaveBusiness(savedId)
    
    if (result.success) {
      onBusinessRemoved(savedId)
      onMessage('Business removed from saved')
    } else {
      onMessage(result.error || 'Failed to remove business')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (businesses.length === 0) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Saved Businesses</h2>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
          <Heart className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600">No saved businesses yet</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-6">Saved Businesses</h2>
      <div className="space-y-4">
        {businesses.map((business) => (
          <div key={business.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                  {business.provider_name || 'Unknown Business'}
                </h3>
                {business.provider_category && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{business.provider_category}</span>
                  </p>
                )}
                {business.provider_address && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                    <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{business.provider_address}</span>
                  </p>
                )}
                {business.provider_tags && business.provider_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {business.provider_tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => business.id && handleRemove(business.id)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

