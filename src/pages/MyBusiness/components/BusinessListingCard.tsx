import type { BusinessListing } from '../types'
import type { ProviderChangeRequest } from '../../../lib/supabaseData'

/**
 * BUSINESS LISTING CARD COMPONENT
 * 
 * Displays a single business listing with all its details including:
 * - Header with badges and action buttons
 * - Image gallery (mobile horizontal scroll, desktop grid)
 * - Business information (category, contact, address, tags, description)
 * - Social media links
 * - Google Calendar integration (featured accounts only)
 * - Action buttons (downgrade, delete)
 * 
 * This component was extracted from MyBusiness.tsx to improve maintainability.
 * 
 * DEPENDENCY TRACKING:
 * 
 * WHAT THIS DEPENDS ON:
 * - listing.is_member: Must be true to show Google Calendar section
 * - listing.booking_enabled OR listing.enable_calendar_booking: Either must be true to show section
 * - listing.google_calendar_connected: Used to show connection status and button state
 * - listing.enable_calendar_booking: Used to show "(Required)" on button when enabled but not connected
 * - onConnectGoogleCalendar: Function to initiate OAuth flow
 * - onDisconnectGoogleCalendar: Function to disconnect calendar
 * 
 * WHAT DEPENDS ON THIS:
 * - ListingsTab: Renders BusinessListingCard for each listing
 * - MyBusiness page: Provides connection/disconnection functions
 * 
 * BREAKING CHANGES:
 * - If you change button visibility condition → Connection button won't appear when it should
 * - If you remove "(Required)" indicator → Users won't know connection is needed
 * - If you change button color logic → Visual feedback will be wrong
 * 
 * RECENT CHANGES (2025-01-XX):
 * - ✅ Fixed button visibility condition to show when enable_calendar_booking is true (not just booking_enabled)
 * - ✅ Enhanced button to show "(Required)" when calendar booking is enabled but not connected
 * - ✅ Changed button color to amber when connection is required
 * 
 * RELATED FILES:
 * - src/pages/MyBusiness/components/BusinessListingForm.tsx: Form where users enable calendar booking
 * - src/pages/MyBusiness.tsx: Provides connection/disconnection functions
 * - netlify/functions/google-calendar-connect.ts: OAuth initiation
 * - netlify/functions/google-calendar-callback.ts: OAuth callback
 * 
 * CRITICAL NOTES:
 * - Button visibility condition: `is_member && (booking_enabled || enable_calendar_booking)`
 * - Button shows "(Required)" when: `enable_calendar_booking && !google_calendar_connected`
 * 
 * See: docs/prevention/GOOGLE_CALENDAR_CONNECTION_FIX.md - Detailed analysis
 * See: docs/prevention/CASCADING_FAILURES.md - General prevention guide
 */

interface BusinessListingCardProps {
  listing: BusinessListing
  changeRequests: ProviderChangeRequest[]
  onEdit: (listing: BusinessListing) => void
  onUpgradeToFeatured: (listingId: string) => void
  onPromptAndUploadImages: (listing: BusinessListing) => void
  onConnectGoogleCalendar: (listingId: string) => void
  onDisconnectGoogleCalendar: (listingId: string) => void
  onDowngradeToFree: (listingId: string) => void
  onDelete: (listingId: string) => void
  connectingCalendar: boolean
}

export function BusinessListingCard({
  listing,
  changeRequests,
  onEdit,
  onUpgradeToFeatured,
  onPromptAndUploadImages,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
  onDowngradeToFree,
  onDelete,
  connectingCalendar
}: BusinessListingCardProps) {
  
  // Check if this listing has pending changes
  const hasPendingChanges = changeRequests.some(
    req => req.provider_id === listing.id && req.status === 'pending'
  )

  /**
   * OPEN IMAGE IN FULL SCREEN MODAL
   * Creates a dynamic modal to display image at full size
   */
  const openImageModal = (imageUrl: string, index: number, totalImages: number) => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4'
    modal.innerHTML = `
      <div class="relative max-w-4xl max-h-full">
        <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 text-white hover:text-gray-300 z-10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <img src="${imageUrl}" alt="${listing.name} - Image ${index + 1}" class="max-w-full max-h-full object-contain rounded-lg">
        <div class="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          ${index + 1} of ${totalImages}
        </div>
      </div>
    `
    document.body.appendChild(modal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-2 sm:p-3 md:p-4 lg:p-6 bg-white shadow-sm hover:shadow-md transition-shadow my-business-card">
      <div className="space-y-4 my-business-space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:items-center sm:justify-between gap-3 my-business-gap-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2 my-business-heading-lg text-center sm:text-left">
              {listing.name}
            </h3>
            <div className="flex flex-wrap gap-2 my-business-gap-2 justify-center sm:justify-start">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium my-business-badge ${
                listing.is_member 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {listing.is_member ? '⭐ Featured' : '📋 Free'}
              </span>
              {hasPendingChanges ? (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800 my-business-badge">
                  ⏳ Changes Pending
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800 my-business-badge">
                  ✓ Live
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 my-business-action-group my-business-gap-2">
            {!listing.is_member && (
              <div className="space-y-2">
                <button
                  onClick={() => onUpgradeToFeatured(listing.id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Upgrade to Featured
                </button>
                <p className="text-xs text-neutral-500 text-center sm:text-right">
                  $97/year
                </p>
              </div>
            )}
            
            <button
              onClick={() => onEdit(listing)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Details
            </button>
          </div>
        </div>
          
        {/* Business Images Gallery */}
        {listing.images && listing.images.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-neutral-700 mb-3">Business Images ({listing.images.length})</h4>
            
            {/* Mobile horizontal scroll */}
            <div className="sm:hidden overflow-x-auto -mx-4 px-4 mb-4">
              <div className="flex gap-3 pb-2" style={{width: 'max-content'}}>
                {listing.images.map((imageUrl, index) => (
                  <div 
                    key={index} 
                    className="relative group cursor-pointer flex-shrink-0"
                    style={{width: '120px'}}
                    onClick={() => openImageModal(imageUrl, index, listing.images?.length || 0)}
                  >
                    <img
                      src={imageUrl}
                      alt={`${listing.name} - Image ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-all duration-200 bg-white"
                      loading="lazy"
                      onError={(e) => {
                        console.error('[BusinessListingCard] Image failed to load:', imageUrl)
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f5f5f5" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                      <svg className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                    <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-full pointer-events-none">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Desktop grid */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {listing.images.map((imageUrl, index) => (
                <div 
                  key={index} 
                  className="relative group cursor-pointer"
                  onClick={() => openImageModal(imageUrl, index, listing.images?.length || 0)}
                >
                  <img
                    src={imageUrl}
                    alt={`${listing.name} - Image ${index + 1}`}
                    className="w-full h-20 sm:h-24 md:h-28 object-cover rounded-lg border border-neutral-200 hover:shadow-lg transition-all duration-200 hover:scale-105 bg-white"
                    loading="lazy"
                    onError={(e) => {
                      console.error('[BusinessListingCard] Image failed to load:', imageUrl)
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23f5f5f5" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EImage not found%3C/text%3E%3C/svg%3E'
                    }}
                  />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/30 transition-all duration-200 rounded-lg flex items-center justify-center pointer-events-none">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                  <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-full pointer-events-none">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <p className="text-xs text-neutral-500 text-center sm:text-left">Click any image to view full size</p>
              <button
                onClick={() => onPromptAndUploadImages(listing)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Images
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center bg-neutral-50">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-lg font-medium text-neutral-700 mb-2">Upload Images</h4>
                <p className="text-sm text-neutral-500 mb-4 max-w-sm">
                  Showcase your business with high-quality photos to attract more customers
                </p>
                <button
                  onClick={() => onPromptAndUploadImages(listing)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Images
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Business Information */}
        <div className="bg-neutral-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-neutral-800 mb-3">Business Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Category</span>
                <span className="text-sm text-neutral-700">{listing.category_key}</span>
              </div>
              <div className="flex items-start">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Email</span>
                <span className="text-sm text-neutral-700">{listing.email || 'Not provided'}</span>
              </div>
              <div className="flex items-start">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Phone</span>
                <span className="text-sm text-neutral-700">{listing.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-start">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Website</span>
                <span className="text-sm text-neutral-700">
                  {listing.website ? (
                    <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {listing.website}
                    </a>
                  ) : 'Not provided'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {listing.address && (
                <div className="flex items-start">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Address</span>
                  <span className="text-sm text-neutral-700">{listing.address}</span>
                </div>
              )}
              {listing.tags && listing.tags.length > 0 && (
                <div className="flex items-start">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0">Tags</span>
                  <span className="text-sm text-neutral-700">{listing.tags.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          
          {listing.description && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-start">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide w-20 flex-shrink-0 mr-4">Description</span>
                <br /><p className="text-sm text-neutral-700 leading-relaxed">{listing.description}</p>
              </div>
            </div>
          )}
          
          {listing.bonita_resident_discount && (
            <div className="mt-4 pt-4 border-t border-neutral-200">
              <div className="flex items-start">
                <span className="text-xs font-medium text-green-600 uppercase tracking-wide w-20 flex-shrink-0">Discount</span>
                <p className="text-sm text-green-700 font-medium">{listing.bonita_resident_discount}</p>
              </div>
            </div>
          )}
        </div>

        {/* Social Links */}
        {listing.social_links && Object.keys(listing.social_links).length > 0 && (
          <div className="bg-neutral-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-neutral-800 mb-3">Social Media</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(listing.social_links).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                  {platform}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Google Calendar Integration - Featured accounts only */}
        {listing.is_member && (listing.booking_enabled || listing.enable_calendar_booking) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-neutral-800">Google Calendar Sync</h4>
                </div>
                
                {listing.google_calendar_connected ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-700 font-medium">Connected</span>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Bookings are automatically synced to your Google Calendar{listing.google_calendar_id && ` (${listing.google_calendar_id})`}
                    </p>
                    {!listing.google_calendar_sync_enabled && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-xs text-amber-700">Sync is paused</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-600">
                      Sync your bookings with Google Calendar to manage appointments seamlessly
                    </p>
                    <ul className="text-xs text-neutral-500 space-y-1 ml-4 list-disc">
                      <li>Automatic calendar updates</li>
                      <li>Real-time availability</li>
                      <li>Email reminders</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              {listing.google_calendar_connected ? (
                <>
                  <button
                    onClick={() => onDisconnectGoogleCalendar(listing.id)}
                    disabled={connectingCalendar}
                    className="inline-flex items-center justify-center px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connectingCalendar ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Disconnect
                      </>
                    )}
                  </button>
                  <a
                    href={`https://calendar.google.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Calendar
                  </a>
                </>
              ) : (
                <button
                  onClick={() => onConnectGoogleCalendar(listing.id)}
                  disabled={connectingCalendar}
                  className={`inline-flex items-center justify-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    listing.enable_calendar_booking && !listing.google_calendar_connected
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {connectingCalendar ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                      </svg>
                      {listing.enable_calendar_booking && !listing.google_calendar_connected
                        ? 'Connect Google Calendar (Required)'
                        : 'Connect Google Calendar'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200">
          {/* Downgrade button - only for featured listings */}
          {listing.is_member && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to downgrade to Free? You will lose Featured benefits including priority placement, enhanced visibility, and immediate updates. This action requires admin approval.')) {
                  onDowngradeToFree(listing.id)
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-6-6m0 6l6-6" />
              </svg>
              Downgrade to Free
            </button>
          )}
          
          <button
            onClick={() => onDelete(listing.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Listing
          </button>
        </div>

      </div>
    </div>
  )
}

