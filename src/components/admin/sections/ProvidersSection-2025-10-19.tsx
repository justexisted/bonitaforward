import React from 'react'
import { type ProviderRow } from '../../../pages/Admin'
import { ProviderCoreInfoFields } from '../ProviderCoreInfoFields'
import { ProviderDescriptionField } from '../ProviderDescriptionField-2025-10-19'
import { ProviderCouponFields } from '../ProviderCouponFields-2025-10-19'
import { ProviderMetadataFields } from '../ProviderMetadataFields-2025-10-19'
import { ProviderTagsEditor } from '../ProviderTagsEditor-2025-10-19'
import { ProviderBusinessHours } from '../ProviderBusinessHours-2025-10-19'
import { ProviderImagesManager } from '../ProviderImagesManager-2025-10-19'

interface ProvidersSectionProps {
  providers: ProviderRow[]
  selectedProviderId: string | null
  isCreatingNewProvider: boolean
  newProviderForm: Partial<ProviderRow>
  savingProvider: boolean
  uploadingImages: boolean
  retryProvider: ProviderRow | null
  confirmDeleteProviderId: string | null
  catOptions: Array<{ key: string; name: string }>
  message: string | null
  error: string | null
  
  onSetSelectedProviderId: (id: string | null) => void
  onStartCreateNewProvider: () => void
  onCancelCreateProvider: () => void
  onSetNewProviderForm: (update: (prev: Partial<ProviderRow>) => Partial<ProviderRow>) => void
  onSaveProvider: (provider: ProviderRow) => Promise<void>
  onDeleteProvider: (id: string) => Promise<void>
  onRetrySaveProvider: () => void
  onHandleImageUpload: (event: React.ChangeEvent<HTMLInputElement>, providerId: string) => Promise<void>
  onRemoveImage: (providerId: string, imageUrl: string) => Promise<void>
  onToggleBookingEnabled: (providerId: string, currentlyEnabled: boolean) => Promise<void>
  onSetProviders: (update: (prev: ProviderRow[]) => ProviderRow[]) => void
  onSetConfirmDeleteProviderId: (id: string | null) => void
}

export const ProvidersSection: React.FC<ProvidersSectionProps> = ({
  providers,
  selectedProviderId,
  isCreatingNewProvider,
  newProviderForm,
  savingProvider,
  uploadingImages,
  retryProvider,
  confirmDeleteProviderId,
  catOptions,
  message,
  error,
  onSetSelectedProviderId,
  onStartCreateNewProvider,
  onCancelCreateProvider,
  onSetNewProviderForm,
  onSaveProvider,
  onDeleteProvider,
  onRetrySaveProvider,
  onHandleImageUpload,
  onRemoveImage,
  onToggleBookingEnabled,
  onSetProviders,
  onSetConfirmDeleteProviderId,
}) => {
  return (
    <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="flex items-center justify-between">
        <div className="font-medium">Providers Management</div>
        <div className="flex items-center gap-2">
          {!isCreatingNewProvider ? (
            <button
              onClick={onStartCreateNewProvider}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm"
            >
              + Create New Provider
            </button>
          ) : (
            <button
              onClick={onCancelCreateProvider}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium text-sm"
            >
              Cancel Create
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 text-sm">
        {providers.length === 0 && <div className="text-neutral-500">No providers found.</div>}
        {providers.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                list="providers-list"
                placeholder="Type to search provider"
                onChange={(e) => {
                  const name = e.target.value
                  const match = providers.find((p) => p.name.toLowerCase() === name.toLowerCase())
                  if (match) {
                    onSetSelectedProviderId(match.id)
                  }
                }}
                className="rounded-xl border border-neutral-200 px-3 py-2 sm:col-span-2"
              />
              <select
                value={selectedProviderId || ''}
                onChange={(e) => {
                  onSetSelectedProviderId(e.target.value || null)
                }}
                className="rounded-xl border border-neutral-200 px-3 py-2 bg-white"
              >
                <option value="">Select provider…</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <datalist id="providers-list">
                {providers.map((p) => (
                  <option key={p.id} value={p.name}></option>
                ))}
              </datalist>
            </div>
            {/* Enhanced Provider Edit Form - Matching My Business Page Functionality */}
            {(() => {
              // If creating new provider, use the form state
              if (isCreatingNewProvider) {
                return (
                  <div className="rounded-xl border border-green-200 p-6 bg-green-50">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">Create New Provider</h3>
                        <p className="text-sm text-green-700 mt-1">Fill out the form below to create a new provider</p>
                      </div>
                      <button
                        onClick={onCancelCreateProvider}
                        className="text-green-600 hover:text-green-800 text-xl"
                      >
                        ✕
                      </button>
                    </div>
                    {/* Use the existing form but with newProviderTemplate */}
                    {/* The existing form content will be copied here - continuing with the form fields */}
                    
                    {/* Core Business Information */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium text-green-800 mb-4">Core Business Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-1">
                              Business Name *
                            </label>
                            <input 
                              value={newProviderForm.name || ''} 
                              onChange={(e) => {
                                onSetNewProviderForm(prev => ({ ...prev, name: e.target.value }))
                              }} 
                              className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                              placeholder="Enter business name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-1">
                              Category *
                            </label>
                            <select 
                              value={newProviderForm.category_key || 'professional-services'} 
                              onChange={(e) => {
                                onSetNewProviderForm(prev => ({ ...prev, category_key: e.target.value }))
                              }} 
                              className="w-full rounded-lg border border-green-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              {catOptions.map((opt) => (
                                <option key={opt.key} value={opt.key}>{opt.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-1">
                              Phone Number
                            </label>
                            <input 
                              value={newProviderForm.phone || ''} 
                              onChange={(e) => {
                                onSetNewProviderForm(prev => ({ ...prev, phone: e.target.value }))
                              }} 
                              className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                              placeholder="(619) 123-4567"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-1">
                              Email Address
                            </label>
                            <input 
                              value={newProviderForm.email || ''} 
                              onChange={(e) => {
                                onSetNewProviderForm(prev => ({ ...prev, email: e.target.value }))
                              }} 
                              className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                              placeholder="business@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-1">
                              Website
                            </label>
                            <input 
                              value={newProviderForm.website || ''} 
                              onChange={(e) => {
                                onSetNewProviderForm(prev => ({ ...prev, website: e.target.value }))
                              }} 
                              className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                              placeholder="https://www.example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-green-700 mb-1">
                              Address
                            </label>
                            <input 
                              value={newProviderForm.address || ''} 
                              onChange={(e) => {
                                onSetNewProviderForm(prev => ({ ...prev, address: e.target.value }))
                              }} 
                              className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                              placeholder="123 Main St, Bonita, CA 91902"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div>
                        <div>
                          <label className="block text-sm font-medium text-green-700 mb-1">
                            Specialties
                            <span className="text-xs text-green-600 ml-2">
                              (Comma-separated)
                            </span>
                          </label>
                          <input 
                            defaultValue={(newProviderForm.specialties || []).join(', ')} 
                            onBlur={(e) => {
                              onSetNewProviderForm(prev => ({ 
                                ...prev, 
                                specialties: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                              }))
                            }} 
                            className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                            placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography, Tax Planning"
                          />
                          <p className="text-xs text-green-600 mt-1">
                            Type freely. Changes save when you leave the field.
                          </p>
                        </div>
                      </div>

                      {/* Business Hours - Only for Featured Accounts */}
                      <div>
                        <h4 className="text-md font-medium text-green-800 mb-4">Business Hours</h4>
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="enable-business-hours"
                              checked={newProviderForm.subscription_type !== 'free' && newProviderForm.business_hours !== null}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Initialize with default hours if enabling
                                  const defaultHours = {
                                    monday: '9:00 AM - 5:00 PM',
                                    tuesday: '9:00 AM - 5:00 PM',
                                    wednesday: '9:00 AM - 5:00 PM',
                                    thursday: '9:00 AM - 5:00 PM',
                                    friday: '9:00 AM - 5:00 PM',
                                    saturday: '10:00 AM - 4:00 PM',
                                    sunday: 'Closed'
                                  }
                                  onSetNewProviderForm(prev => ({ ...prev, business_hours: defaultHours }))
                                } else {
                                  onSetNewProviderForm(prev => ({ ...prev, business_hours: null }))
                                }
                              }}
                              disabled={newProviderForm.subscription_type === 'free'}
                              className="rounded border-green-300 text-green-600 focus:ring-green-500"
                            />
                            <label htmlFor="enable-business-hours" className="text-sm font-medium text-green-700">
                              Set Business Hours
                              {newProviderForm.subscription_type === 'free' && (
                                <span className="text-xs text-green-600 ml-2">(Featured accounts only)</span>
                              )}
                            </label>
                          </div>
                          
                          {newProviderForm.subscription_type !== 'free' && newProviderForm.business_hours && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {[
                                { key: 'monday', label: 'Monday' },
                                { key: 'tuesday', label: 'Tuesday' },
                                { key: 'wednesday', label: 'Wednesday' },
                                { key: 'thursday', label: 'Thursday' },
                                { key: 'friday', label: 'Friday' },
                                { key: 'saturday', label: 'Saturday' },
                                { key: 'sunday', label: 'Sunday' }
                              ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                  <label className="text-sm font-medium text-green-700 w-20">
                                    {label}:
                                  </label>
                                  <input
                                    type="text"
                                    value={newProviderForm.business_hours?.[key] || ''}
                                    onChange={(e) => {
                                      onSetNewProviderForm(prev => ({
                                        ...prev,
                                        business_hours: {
                                          ...prev.business_hours,
                                          [key]: e.target.value
                                        }
                                      }))
                                    }}
                                    className="flex-1 rounded-lg border border-green-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="e.g., 9:00 AM - 5:00 PM"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {newProviderForm.subscription_type === 'free' && (
                            <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                              Business hours are only available for featured accounts. Upgrade to a featured plan to set business hours.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Plan Selection */}
                      <div>
                        <h4 className="text-md font-medium text-green-800 mb-4">Plan Type</h4>
                        <select 
                          value={newProviderForm.subscription_type || 'free'} 
                          onChange={(e) => {
                            const newPlan = e.target.value
                            onSetNewProviderForm(prev => ({
                              ...prev,
                              subscription_type: newPlan === 'free' ? null : newPlan,
                              is_member: newPlan !== 'free',
                              is_featured: newPlan !== 'free',
                              featured_since: newPlan !== 'free' ? new Date().toISOString() : null,
                              // Clear business hours if downgrading to free plan
                              business_hours: newPlan === 'free' ? null : prev.business_hours
                            }))
                          }}
                          className="rounded-lg border border-green-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="free">Free Plan</option>
                          <option value="yearly">Yearly ($97/yr)</option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-4 pt-4 border-t border-green-200">
                        <button 
                          onClick={() => {
                            const providerToSave: ProviderRow = {
                              id: 'new',
                              name: newProviderForm.name || '',
                              category_key: newProviderForm.category_key || 'professional-services',
                              tags: newProviderForm.tags || [],
                              badges: newProviderForm.badges || [],
                              rating: newProviderForm.rating || null,
                              phone: newProviderForm.phone || null,
                              email: newProviderForm.email || null,
                              website: newProviderForm.website || null,
                              address: newProviderForm.address || null,
                              images: newProviderForm.images || [],
                              owner_user_id: newProviderForm.owner_user_id || null,
                              is_member: newProviderForm.is_member || false,
                              is_featured: newProviderForm.is_featured || false,
                              featured_since: newProviderForm.featured_since || null,
                              subscription_type: newProviderForm.subscription_type || null,
                              description: newProviderForm.description || null,
                              specialties: newProviderForm.specialties || null,
                              social_links: newProviderForm.social_links || null,
                              business_hours: newProviderForm.business_hours || null,
                              service_areas: newProviderForm.service_areas || null,
                              google_maps_url: newProviderForm.google_maps_url || null,
                              bonita_resident_discount: newProviderForm.bonita_resident_discount || null,
                              published: newProviderForm.published ?? true,
                              created_at: newProviderForm.created_at || null,
                              updated_at: newProviderForm.updated_at || null,
                              booking_enabled: newProviderForm.booking_enabled || false,
                              booking_type: newProviderForm.booking_type || null,
                              booking_instructions: newProviderForm.booking_instructions || null,
                              booking_url: newProviderForm.booking_url || null
                            }
                            onSaveProvider(providerToSave)
                          }} 
                          disabled={savingProvider || !newProviderForm.name?.trim()}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {savingProvider && (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {savingProvider ? 'Creating...' : 'Create Provider'}
                        </button>
                        <button
                          onClick={onCancelCreateProvider}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }

              // Existing logic for editing
              const editingProvider = selectedProviderId
                ? providers.find(p => p.id === selectedProviderId)
                : providers[0]
              
              if (!editingProvider) return null
              
              return (
                <div className="rounded-xl border border-neutral-200 p-6 bg-white">
                  {/* Header section - stacks on mobile, side-by-side on desktop */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Editing: {editingProvider.name}</h3>
                      <p className="text-sm text-neutral-600 mt-1">
                        {(() => {
                          // ACCOUNT STATUS DISPLAY: Use subscription_type to determine account status
                          // This ensures the display matches the actual plan system
                          if (editingProvider.subscription_type) {
                            return 'Featured Account'
                          }
                          return 'Free Account'
                        })()} • 
                        Category: {editingProvider.category_key}
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* PLAN DROPDOWN: Replace checkbox with plan selection dropdown */}
                      {/* This allows admins to set providers as free, monthly, or yearly plans */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-neutral-700">Plan Type:</label>
                        <select 
                          value={editingProvider.subscription_type || 'free'} 
                          onChange={(e) => {
                            const newPlan = e.target.value
                            const now = new Date().toISOString()
                            onSetProviders((arr) => arr.map(p => 
                              p.id === editingProvider.id ? {
                                ...p, 
                                subscription_type: newPlan === 'free' ? null : newPlan,
                                is_member: newPlan !== 'free',
                                is_featured: newPlan !== 'free',
                                featured_since: newPlan !== 'free' ? (p.featured_since || now) : null,
                                // Clear business hours if downgrading to free plan
                                business_hours: newPlan === 'free' ? null : p.business_hours
                              } : p
                            ))
                          }}
                          className="rounded-lg border border-neutral-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                        >
                          <option value="free">Free</option>
                          <option value="yearly">Yearly ($97/yr)</option>
                        </select>
                      </div>
                      
                      {/* PLAN DURATION DISPLAY: Show how long the provider has been on their current plan */}
                      {/* This helps admins track plan duration and billing cycles */}
                      {editingProvider.subscription_type && editingProvider.featured_since && (
                        <div className="text-xs text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                          Featured since: {new Date(editingProvider.featured_since).toLocaleDateString()}
                          {editingProvider.subscription_type && (
                            <span className="ml-1">
                              ({editingProvider.subscription_type === 'monthly' ? 'Monthly' : 'Yearly'} plan)
                            </span>
                          )}
                          {/* DURATION CALCULATOR: Show how long they've been featured */}
                          {(() => {
                            const startDate = new Date(editingProvider.featured_since!)
                            const now = new Date()
                            const diffTime = Math.abs(now.getTime() - startDate.getTime())
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            const diffMonths = Math.floor(diffDays / 30)
                            const diffYears = Math.floor(diffDays / 365)
                            
                            let durationText = ''
                            if (diffYears > 0) {
                              durationText = `${diffYears} year${diffYears > 1 ? 's' : ''}`
                            } else if (diffMonths > 0) {
                              durationText = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
                            } else {
                              durationText = `${diffDays} day${diffDays > 1 ? 's' : ''}`
                            }
                            
                            return (
                              <span className="ml-1 text-green-600 font-medium">
                                ({durationText} ago)
                              </span>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Core Business Information */}
                  <div className="space-y-6">
                    <ProviderCoreInfoFields
                      provider={editingProvider}
                      catOptions={catOptions}
                      onUpdate={(field, value) => {
                        onSetProviders((arr) => arr.map(p => 
                          p.id === editingProvider.id ? { ...p, [field]: value } : p
                        ))
                      }}
                    />

                    {/* Business Description */}
                    <ProviderDescriptionField
                      provider={editingProvider}
                      onUpdate={(value) => {
                        onSetProviders((arr) => arr.map(p => 
                          p.id === editingProvider.id ? { ...p, description: value } : p
                        ))
                      }}
                    />

                    {/* Coupon System - Featured Only */}
                    <ProviderCouponFields
                      provider={editingProvider}
                      onUpdate={(field, value) => {
                        onSetProviders((arr) => arr.map(p => 
                          p.id === editingProvider.id ? { ...p, [field]: value } : p
                        ))
                      }}
                    />

                    {/* Specialties, Service Areas, Social Media */}
                    <ProviderMetadataFields
                      provider={editingProvider}
                      onUpdate={(field, value) => {
                        onSetProviders((arr) => arr.map(p => 
                          p.id === editingProvider.id ? { ...p, [field]: value } : p
                        ))
                      }}
                    />

                    {/* Business Hours */}
                    <ProviderBusinessHours
                      provider={editingProvider}
                      onUpdate={(field, value) => {
                        onSetProviders((arr) => arr.map(p => 
                          p.id === editingProvider.id ? { ...p, [field]: value } : p
                        ))
                      }}
                    />

                    {/* Images Manager */}
                    <ProviderImagesManager
                      provider={editingProvider}
                      uploadingImages={uploadingImages}
                      onImageUpload={onHandleImageUpload}
                      onImageRemove={onRemoveImage}
                    />

                    {/* Booking System - Featured Only */}
                    <div className={!editingProvider.is_member ? 'opacity-50 pointer-events-none' : ''}>
                      <h4 className="text-md font-medium text-neutral-800 mb-4">
                        Booking System Configuration
                        {!editingProvider.is_member && (
                          <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
                        )}
                      </h4>
                      
                      {!editingProvider.is_member && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800">
                            <strong>Upgrade to Featured</strong> to enable online booking and appointment scheduling.
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        {/* Enable Booking Toggle Switch */}
                        <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-neutral-800">
                                Online Booking System
                              </span>
                              {editingProvider.booking_enabled && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 mt-1">
                              {editingProvider.booking_enabled 
                                ? 'Customers can book appointments through your listing'
                                : 'Enable to allow customers to book appointments or reservations online'
                              }
                            </p>
                          </div>
                          
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!editingProvider.is_member) return
                              // Use dedicated toggle function that only updates booking_enabled
                              // Coerce to boolean to handle null/undefined
                              const isCurrentlyEnabled = Boolean(editingProvider.booking_enabled)
                              console.log('[Admin UI] Toggle clicked:', { 
                                providerId: editingProvider.id,
                                currentValue: editingProvider.booking_enabled,
                                isCurrentlyEnabled,
                                willSetTo: !isCurrentlyEnabled
                              })
                              await onToggleBookingEnabled(editingProvider.id, isCurrentlyEnabled)
                            }}
                            disabled={!editingProvider.is_member}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              editingProvider.booking_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                            }`}
                            aria-label="Toggle booking system"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                editingProvider.booking_enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Contact Methods for Booking */}
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-3">
                            Contact Methods for Booking
                          </label>
                          <div className="space-y-3">
                            <p className="text-xs text-neutral-600 mb-3">
                              Choose how customers can contact you for bookings:
                            </p>
                            
                            {/* Calendar Booking Toggle */}
                            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-800">📅 Calendar Booking</span>
                                  {editingProvider.enable_calendar_booking && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Enabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-600 mt-1">
                                  Allow customers to book through your calendar system
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onSetProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, enable_calendar_booking: !p.enable_calendar_booking } : p
                                  ))
                                }}
                                disabled={!editingProvider.is_member || !editingProvider.booking_enabled}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  editingProvider.enable_calendar_booking ? 'bg-blue-600' : 'bg-neutral-300'
                                }`}
                                aria-label="Toggle calendar booking"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    editingProvider.enable_calendar_booking ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Phone Contact Toggle */}
                            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-800">📞 Phone Contact</span>
                                  {editingProvider.enable_call_contact && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Enabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-600 mt-1">
                                  Display your phone number for booking calls
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onSetProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, enable_call_contact: !p.enable_call_contact } : p
                                  ))
                                }}
                                disabled={!editingProvider.is_member || !editingProvider.booking_enabled}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  editingProvider.enable_call_contact ? 'bg-blue-600' : 'bg-neutral-300'
                                }`}
                                aria-label="Toggle phone contact"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    editingProvider.enable_call_contact ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Email Contact Toggle */}
                            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-neutral-800">✉️ Email Contact</span>
                                  {editingProvider.enable_email_contact && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Enabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-neutral-600 mt-1">
                                  Allow customers to email you for bookings
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  onSetProviders((arr) => arr.map(p => 
                                    p.id === editingProvider.id ? { ...p, enable_email_contact: !p.enable_email_contact } : p
                                  ))
                                }}
                                disabled={!editingProvider.is_member || !editingProvider.booking_enabled}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                  editingProvider.enable_email_contact ? 'bg-blue-600' : 'bg-neutral-300'
                                }`}
                                aria-label="Toggle email contact"
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    editingProvider.enable_email_contact ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Info message when booking is disabled */}
                            {!editingProvider.booking_enabled && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  💡 Enable the booking system above to activate these contact methods
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Booking Type */}
                        {editingProvider.booking_enabled && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Booking Type
                            </label>
                            <select 
                              value={editingProvider.booking_type || ''} 
                              onChange={(e) => onSetProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, booking_type: e.target.value as any || null } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                              disabled={!editingProvider.is_member}
                            >
                              <option value="">Select booking type...</option>
                              <option value="appointment">Appointment</option>
                              <option value="reservation">Reservation</option>
                              <option value="consultation">Consultation</option>
                              <option value="walk-in">Walk-in Only</option>
                            </select>
                          </div>
                        )}

                        {/* Booking Instructions */}
                        {editingProvider.booking_enabled && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Booking Instructions
                            </label>
                            <textarea
                              value={editingProvider.booking_instructions || ''}
                              onChange={(e) => onSetProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, booking_instructions: e.target.value } : p
                              ))}
                              rows={3}
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                              placeholder="e.g., Please call ahead for same-day appointments, Book at least 24 hours in advance, Walk-ins welcome during business hours"
                              disabled={!editingProvider.is_member}
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Instructions that will be shown to customers when they try to book
                            </p>
                          </div>
                        )}

                        {/* External Booking URL */}
                        {editingProvider.booking_enabled && (
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              External Booking URL (Optional)
                            </label>
                            <input 
                              value={editingProvider.booking_url || ''} 
                              onChange={(e) => onSetProviders((arr) => arr.map(p => 
                                p.id === editingProvider.id ? { ...p, booking_url: e.target.value } : p
                              ))} 
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                              placeholder="https://calendly.com/yourbusiness or https://yourbookingplatform.com"
                              disabled={!editingProvider.is_member}
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              If you use an external booking platform, enter the URL here. Otherwise, customers will see booking instructions.
                            </p>
                          </div>
                        )}

                        {/* Booking Preview */}
                        {editingProvider.booking_enabled && editingProvider.is_member && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h5 className="text-sm font-medium text-blue-900 mb-2">Booking Preview</h5>
                            <div className="text-sm text-blue-800">
                              <p><strong>Type:</strong> {editingProvider.booking_type || 'Not specified'}</p>
                              {editingProvider.booking_url && (
                                <p><strong>External URL:</strong> <a href={editingProvider.booking_url} target="_blank" rel="noopener noreferrer" className="underline">{editingProvider.booking_url}</a></p>
                              )}
                              {editingProvider.booking_instructions && (
                                <p><strong>Instructions:</strong> {editingProvider.booking_instructions}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <ProviderTagsEditor
                      provider={editingProvider}
                      onUpdate={(tags) => {
                        onSetProviders((arr) => arr.map(p => 
                          p.id === editingProvider.id ? { ...p, tags } : p
                        ))
                      }}
                    />
                  </div>
                  {/* Action Buttons - stacks on mobile, side-by-side on desktop */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-8 pt-6 border-t border-neutral-200">
                    <div className="flex flex-wrap items-center gap-4">
                      <button 
                        onClick={() => onSaveProvider(editingProvider)} 
                        disabled={savingProvider}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingProvider && (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {savingProvider ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => {
                          const id = editingProvider.id
                          if (confirmDeleteProviderId === id) onDeleteProvider(id)
                          else onSetConfirmDeleteProviderId(id)
                        }}
                        className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                      >
                        {confirmDeleteProviderId === editingProvider.id ? 'Confirm Delete' : 'Delete Provider'}
                      </button>
                      {confirmDeleteProviderId === editingProvider.id && (
                        <button 
                          onClick={() => onSetConfirmDeleteProviderId(null)} 
                          className="px-4 py-2 text-neutral-500 hover:text-neutral-700 underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    
                    <div className="text-sm text-neutral-500">
                      Last updated: {editingProvider.updated_at ? new Date(editingProvider.updated_at).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  
                  {/* Save Status Messages */}
                  {message && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-800 font-medium">{message}</span>
                      </div>
                    </div>
                  )}
                  
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="text-red-800 font-medium">{error}</span>
                        </div>
                        {/* RETRY BUTTON: Show retry button for timeout and network errors */}
                        {retryProvider && (
                          <button
                            onClick={onRetrySaveProvider}
                            disabled={savingProvider}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {savingProvider ? (
                              <>
                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Retrying...
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Retry
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

