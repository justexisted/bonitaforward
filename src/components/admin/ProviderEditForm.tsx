import { useState, useEffect } from 'react'
import type { ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER EDIT FORM COMPONENT
 * 
 * This component is extracted from Admin.tsx to solve performance issues.
 * 
 * PROBLEM: In the original Admin.tsx, every keystroke in the edit form would:
 * 1. Call setProviders() which maps through ALL providers
 * 2. Re-render the entire 7000+ line Admin component
 * 3. Recalculate everything
 * Result: Super slow typing (multiple seconds of lag per keystroke)
 * 
 * SOLUTION: This component uses local state for form fields:
 * - Typing is instant (only re-renders this small component)
 * - Parent Admin.tsx only updates when Save is clicked
 * - Dramatically improves performance
 */

interface ProviderEditFormProps {
  provider: ProviderRow
  catOptions: Array<{ key: string; name: string }>
  onSave: (updatedProvider: ProviderRow) => void
  onCancel: () => void
}

export function ProviderEditForm({ provider, catOptions, onSave, onCancel }: ProviderEditFormProps) {
  // LOCAL STATE: Form fields are stored locally for instant updates
  // This prevents the entire Admin component from re-rendering on every keystroke
  const [formData, setFormData] = useState<ProviderRow>(provider)
  
  // Sync with prop changes (when switching providers)
  useEffect(() => {
    setFormData(provider)
  }, [provider.id]) // Only re-sync when provider ID changes

  // Helper to update a single field
  const updateField = (field: keyof ProviderRow, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Helper to update nested social links
  const updateSocialLink = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value }
    }))
  }

  // Helper to update business hours
  const updateBusinessHours = (day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      business_hours: { ...prev.business_hours, [day]: value }
    }))
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Editing: {formData.name}</h3>
          <p className="text-sm text-neutral-600 mt-1">
            {formData.subscription_type ? 'Featured Account' : 'Free Account'} • 
            Category: {formData.category_key}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Plan Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Plan Type:</label>
            <select 
              value={formData.subscription_type || 'free'} 
              onChange={(e) => {
                const newPlan = e.target.value
                const now = new Date().toISOString()
                setFormData(prev => ({
                  ...prev,
                  subscription_type: newPlan === 'free' ? null : newPlan,
                  is_member: newPlan !== 'free',
                  is_featured: newPlan !== 'free',
                  featured_since: newPlan !== 'free' ? (prev.featured_since || now) : null,
                  business_hours: newPlan === 'free' ? null : prev.business_hours
                }))
              }}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
            >
              <option value="free">Free</option>
              <option value="yearly">Yearly ($97/yr)</option>
            </select>
          </div>
          
          {/* Plan Duration Display */}
          {formData.subscription_type && formData.featured_since && (
            <div className="text-xs text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
              Featured since: {new Date(formData.featured_since).toLocaleDateString()}
              {formData.subscription_type && (
                <span className="ml-1">
                  ({formData.subscription_type === 'monthly' ? 'Monthly' : 'Yearly'} plan)
                </span>
              )}
              {(() => {
                const startDate = new Date(formData.featured_since!)
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

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Core Business Information */}
        <div>
          <h4 className="text-md font-medium text-neutral-800 mb-4">Core Business Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Business Name *
              </label>
              <input 
                value={formData.name || ''} 
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="Enter business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Category *
              </label>
              <select 
                value={formData.category_key} 
                onChange={(e) => updateField('category_key', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
              >
                {catOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Phone Number
              </label>
              <input 
                value={formData.phone || ''} 
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="(619) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email Address
              </label>
              <input 
                value={formData.email || ''} 
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="business@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Website
              </label>
              <input 
                value={formData.website || ''} 
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="https://www.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Address
              </label>
              <input 
                value={formData.address || ''} 
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="123 Main St, Bonita, CA 91902"
              />
            </div>
          </div>
        </div>

        {/* Business Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Description
            <span className="text-xs text-neutral-500 ml-2">
              ({(formData.description?.length || 0)}/{formData.is_member ? '500' : '200'} characters)
            </span>
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => {
              const newDescription = e.target.value
              if (!formData.is_member && newDescription.length > 200) {
                return
              }
              updateField('description', newDescription)
            }}
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
              !formData.is_member && (formData.description?.length || 0) > 200
                ? 'border-red-300 focus:ring-red-500'
                : 'border-neutral-300 focus:ring-neutral-500'
            }`}
            placeholder="Tell customers about your business..."
            maxLength={formData.is_member ? 500 : 200}
          />
        </div>

        {/* Coupon System - Featured Only */}
        <div className={!formData.is_member ? 'opacity-50 pointer-events-none' : ''}>
          <h4 className="text-md font-medium text-neutral-800 mb-4">
            Coupon System
            {!formData.is_member && (
              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
            )}
          </h4>
          
          {!formData.is_member && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Upgrade to Featured</strong> to create exclusive coupon codes for your customers.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coupon Code */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Coupon Code
              </label>
              <input 
                value={formData.coupon_code || ''} 
                onChange={(e) => updateField('coupon_code', e.target.value.toUpperCase())}
                disabled={!formData.is_member}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 font-mono disabled:bg-neutral-100" 
                placeholder="e.g., SAVE20, WELCOME10"
              />
              <p className="text-xs text-neutral-500 mt-1">The code customers will use</p>
            </div>

            {/* Coupon Discount */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Discount Amount/Type
              </label>
              <input 
                value={formData.coupon_discount || ''} 
                onChange={(e) => updateField('coupon_discount', e.target.value)}
                disabled={!formData.is_member}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:bg-neutral-100" 
                placeholder="e.g., 20% Off, $50 Off, Free Consultation"
              />
              <p className="text-xs text-neutral-500 mt-1">What customers will get</p>
            </div>

            {/* Coupon Expiration */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Expiration Date (Optional)
              </label>
              <input 
                type="datetime-local"
                value={formData.coupon_expires_at ? new Date(formData.coupon_expires_at).toISOString().slice(0, 16) : ''} 
                onChange={(e) => updateField('coupon_expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                disabled={!formData.is_member}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:bg-neutral-100" 
              />
              <p className="text-xs text-neutral-500 mt-1">When the coupon expires</p>
            </div>

            {/* Coupon Description - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Coupon Description
              </label>
              <textarea
                value={formData.coupon_description || ''}
                onChange={(e) => updateField('coupon_description', e.target.value)}
                disabled={!formData.is_member}
                rows={2}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:bg-neutral-100"
                placeholder="Additional details about the coupon (terms, conditions, etc.)"
              />
              <p className="text-xs text-neutral-500 mt-1">Additional details about the offer</p>
            </div>
          </div>

          {/* Coupon Preview */}
          {formData.coupon_code && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-blue-600 uppercase">Preview</div>
                  <div className="text-2xl font-bold text-neutral-900 font-mono mt-1">
                    {formData.coupon_code}
                  </div>
                  <div className="text-lg font-semibold text-green-700 mt-1">
                    {formData.coupon_discount || 'Discount not set'}
                  </div>
                  {formData.coupon_description && (
                    <div className="text-sm text-neutral-600 mt-2">
                      {formData.coupon_description}
                    </div>
                  )}
                  {formData.coupon_expires_at && (
                    <div className="text-xs text-red-600 mt-2 font-medium">
                      Expires: {new Date(formData.coupon_expires_at).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
                <div className="text-6xl">🎟️</div>
              </div>
            </div>
          )}
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Specialties
            <span className="text-xs text-neutral-500 ml-2">
              (Comma-separated)
            </span>
          </label>
          <input 
            value={(formData.specialties || []).join(', ')} 
            onChange={(e) => updateField('specialties', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography, Tax Planning"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Type comma-separated specialties
          </p>
        </div>

        {/* Service Areas */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Areas You Serve
          </label>
          <input 
            value={(formData.service_areas || []).join(', ')} 
            onChange={(e) => updateField('service_areas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="Bonita, Chula Vista, San Diego, National City"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Type comma-separated areas
          </p>
        </div>

        {/* Social Media Links - Featured Only */}
        <div className={!formData.is_member ? 'opacity-50 pointer-events-none' : ''}>
          <h4 className="text-md font-medium text-neutral-800 mb-4">
            Social Media Links
            {!formData.is_member && (
              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
            )}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
              <input 
                value={formData.social_links?.facebook || ''} 
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="https://facebook.com/yourbusiness"
                disabled={!formData.is_member}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
              <input 
                value={formData.social_links?.instagram || ''} 
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="https://instagram.com/yourbusiness"
                disabled={!formData.is_member}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
