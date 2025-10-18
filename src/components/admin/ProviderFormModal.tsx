/**
 * Provider Form Modal Component
 * 
 * Modal wrapper for creating new providers.
 * Uses ProviderEditForm with green accent colors.
 */

import BusinessHoursEditor from './BusinessHoursEditor'
import type { ProviderRow } from '../../types/admin'
import { CATEGORY_OPTIONS } from '../../hooks/useAdminProviders'

interface ProviderFormModalProps {
  newProviderForm: Partial<ProviderRow>
  setNewProviderForm: React.Dispatch<React.SetStateAction<Partial<ProviderRow>>>
  onSave: () => void
  onCancel: () => void
  savingProvider: boolean
}

/**
 * ProviderFormModal Component
 * 
 * Full-screen modal for creating a new provider.
 * Features green accent colors to distinguish from editing mode.
 */
export default function ProviderFormModal({
  newProviderForm,
  setNewProviderForm,
  onSave,
  onCancel,
  savingProvider
}: ProviderFormModalProps) {
  // Helper to update form fields
  const updateField = (field: keyof ProviderRow, value: any) => {
    setNewProviderForm(prev => ({ ...prev, [field]: value }))
  }

  // Create temporary provider object for components
  const tempProvider: ProviderRow = {
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

  const isValid = newProviderForm.name?.trim().length

  return (
    <div className="rounded-xl border border-green-200 p-6 bg-green-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-green-900">Create New Provider</h3>
          <p className="text-sm text-green-700 mt-1">Fill out the form below to create a new provider</p>
        </div>
        <button
          onClick={onCancel}
          className="text-green-600 hover:text-green-800 text-xl"
        >
          ✕
        </button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Core Business Information */}
        <div>
          <h4 className="text-md font-medium text-green-800 mb-4">Core Business Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                Business Name *
              </label>
              <input 
                value={newProviderForm.name || ''} 
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                placeholder="Enter business name"
              />
            </div>
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                Category *
              </label>
              <select 
                value={newProviderForm.category_key || 'professional-services'} 
                onChange={(e) => updateField('category_key', e.target.value)}
                className="w-full rounded-lg border border-green-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                Phone Number
              </label>
              <input 
                value={newProviderForm.phone || ''} 
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                placeholder="(619) 123-4567"
              />
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                Email Address
              </label>
              <input 
                value={newProviderForm.email || ''} 
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                placeholder="business@example.com"
              />
            </div>
            
            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                Website
              </label>
              <input 
                value={newProviderForm.website || ''} 
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                placeholder="https://www.example.com"
              />
            </div>
            
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">
                Address
              </label>
              <input 
                value={newProviderForm.address || ''} 
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
                placeholder="123 Main St, Bonita, CA 91902"
              />
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-sm font-medium text-green-700 mb-1">
            Specialties
            <span className="text-xs text-green-600 ml-2">(Comma-separated)</span>
          </label>
          <input 
            defaultValue={(newProviderForm.specialties || []).join(', ')} 
            onBlur={(e) => updateField('specialties', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-green-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" 
            placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography"
          />
          <p className="text-xs text-green-600 mt-1">
            Type freely. Changes save when you leave the field.
          </p>
        </div>

        {/* Business Hours */}
        <BusinessHoursEditor
          provider={tempProvider}
          onChange={(businessHours) => updateField('business_hours', businessHours)}
          accentColor="green"
        />

        {/* Plan Selection */}
        <div>
          <h4 className="text-md font-medium text-green-800 mb-4">Plan Type</h4>
          <select 
            value={newProviderForm.subscription_type || 'free'} 
            onChange={(e) => {
              const newPlan = e.target.value
              setNewProviderForm(prev => ({
                ...prev,
                subscription_type: newPlan === 'free' ? null : newPlan,
                is_member: newPlan !== 'free',
                is_featured: newPlan !== 'free',
                featured_since: newPlan !== 'free' ? new Date().toISOString() : null,
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
            onClick={onSave} 
            disabled={savingProvider || !isValid}
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
            onClick={onCancel}
            disabled={savingProvider}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

