// Providers section component - extracted from Admin.tsx

import { useEffect } from 'react'
import { useAdminProviders } from '../../hooks/useAdminProviders'
import type { AdminSection } from '../../types/admin'
import { fixImageUrl } from '../../utils/imageUtils'

interface ProvidersSectionProps {
  isAdmin: boolean
  section: AdminSection
}

export default function ProvidersSection({ isAdmin, section }: ProvidersSectionProps) {
  const {
    providers,
    loading,
    error,
    savingProvider,
    retryProvider,
    confirmDeleteProviderId,
    loadProviders,
    saveProvider,
    deleteProvider,
    toggleFeaturedStatus,
    updateSubscriptionType,
    setError,
    setRetryProvider,
    setSelectedProviderId,
    setConfirmDeleteProviderId,
  } = useAdminProviders()

  useEffect(() => {
    if (isAdmin && section === 'providers') {
      loadProviders()
    }
  }, [isAdmin, section, loadProviders])

  if (!isAdmin || section !== 'providers') {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Business Providers</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {providers.length} total providers
          </span>
          <button
            onClick={loadProviders}
            disabled={loading}
            className="btn btn-secondary text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-red-600 text-sm">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {retryProvider && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">
                Failed to save provider "{retryProvider.name}"
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Would you like to retry?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveProvider(retryProvider)}
                disabled={savingProvider}
                className="btn btn-primary text-xs"
              >
                {savingProvider ? 'Saving...' : 'Retry'}
              </button>
              <button
                onClick={() => setRetryProvider(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Featured
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {(() => {
                          const imageUrl = provider.images && provider.images.length > 0 ? fixImageUrl(provider.images[0]) : ''
                          return imageUrl ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={imageUrl}
                              alt={provider.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-sm font-medium">
                                {provider.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {provider.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {provider.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {provider.category_key}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      provider.published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {provider.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleFeaturedStatus(provider.id, !!provider.is_featured)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        provider.is_featured 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      } hover:opacity-75`}
                    >
                      {provider.is_featured ? 'Featured' : 'Standard'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={provider.subscription_type || 'monthly'}
                      onChange={(e) => updateSubscriptionType(provider.id, e.target.value as 'monthly' | 'yearly')}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedProviderId(provider.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteProviderId(provider.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading providers...</div>
        </div>
      )}

      {providers.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-gray-500">No providers found</div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteProviderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this provider? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteProviderId(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProvider(confirmDeleteProviderId)
                  setConfirmDeleteProviderId(null)
                }}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
