/**
 * LISTINGS TAB COMPONENT
 * 
 * Displays the Business Listings tab content:
 * - Header with create button
 * - Empty state when no listings exist
 * - List of BusinessListingCard components
 * 
 * Features:
 * - Create new listing button
 * - Empty state with call-to-action
 * - List of business listings with all actions
 */

import { type BusinessListing } from '../types'
import { type ProviderChangeRequest } from '../../../lib/supabaseData'
import { BusinessListingCard } from './BusinessListingCard'

interface ListingsTabProps {
  listings: BusinessListing[]
  changeRequests: ProviderChangeRequest[]
  onCreateNew: () => void
  onEdit: (listing: BusinessListing) => void
  onUpgradeToFeatured: (listingId?: string) => Promise<void>
  onPromptAndUploadImages: (listing: BusinessListing) => Promise<void>
  onConnectGoogleCalendar: (providerId: string) => Promise<void>
  onDisconnectGoogleCalendar: (providerId: string) => Promise<void>
  onDowngradeToFree: (providerId: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  connectingCalendar: boolean
  hasPlanChosen: boolean
  onScrollToPlanSelection?: () => void
}

export function ListingsTab({
  listings,
  changeRequests,
  onCreateNew,
  onEdit,
  onUpgradeToFeatured,
  onPromptAndUploadImages,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
  onDowngradeToFree,
  onDelete,
  connectingCalendar,
  hasPlanChosen,
  onScrollToPlanSelection
}: ListingsTabProps) {
  // Handle create listing click - redirect to plan selection if no plan chosen
  const handleCreateListing = () => {
    if (!hasPlanChosen && onScrollToPlanSelection) {
      // Scroll to plan selection section
      onScrollToPlanSelection()
      return
    }
    onCreateNew()
  }

  return (
    <div className="space-y-4 my-business-space-y-4">
      {/* Header with Create Button */}
      <div className="flex flex-wrap items-center justify-between my-business-gap-2">
        <div className="p-[1vh] m-[1vh]">
          <div className="flex items-center gap-3">
            {hasPlanChosen && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-xs font-semibold">
                2
              </span>
            )}
            <div>
              <h2 className="text-lg font-semibold my-business-heading-lg">Your Business Listings</h2>
              <p className="text-sm text-neutral-600 my-business-text-sm">Manage your business listings and details</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCreateListing}
          className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 my-business-btn"
        >
          + Create New Listing
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-neutral-100 p-3 sm:p-4 md:p-6 lg:p-8 bg-white text-center my-business-empty-state">
          <div className="max-w-md mx-auto">
            {!hasPlanChosen ? (
              <>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 my-business-empty-icon">
                  <svg className="w-8 h-8 text-amber-600 my-business-icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2 my-business-heading-xl">Step 1 Required First</h3>
                <p className="text-neutral-600 mb-4 my-business-text-sm">
                  Before creating your first listing, you need to choose your business plan (Free or Featured).
                </p>
                <p className="text-sm text-neutral-500 mb-6">
                  Please scroll up and select a plan in <strong>Step 1</strong> above, then return here to create your listing.
                </p>
                <button
                  onClick={handleCreateListing}
                  className="inline-flex items-center px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors my-business-btn-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Go to Step 1: Choose Plan
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 my-business-empty-icon">
                  <svg className="w-8 h-8 text-blue-600 my-business-icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-xs font-semibold">
                    2
                  </span>
                  <h3 className="text-xl font-semibold text-neutral-900 my-business-heading-xl">Create Your First Listing</h3>
                </div>
                <p className="text-neutral-600 mb-6 my-business-text-sm">Now that you've chosen your plan, create your first business listing!</p>
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors my-business-btn-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Listing
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        listings.map((listing) => (
          <BusinessListingCard
            key={listing.id}
            listing={listing}
            changeRequests={changeRequests}
            onEdit={(listing) => {
              console.log('[MyBusiness] Edit button clicked for listing:', listing.id, listing.name)
              onEdit(listing)
            }}
            onUpgradeToFeatured={onUpgradeToFeatured}
            onPromptAndUploadImages={onPromptAndUploadImages}
            onConnectGoogleCalendar={onConnectGoogleCalendar}
            onDisconnectGoogleCalendar={onDisconnectGoogleCalendar}
            onDowngradeToFree={onDowngradeToFree}
            onDelete={onDelete}
            connectingCalendar={connectingCalendar}
          />
        ))
      )}
    </div>
  )
}

