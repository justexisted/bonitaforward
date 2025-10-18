/**
 * Provider Edit Form Component
 * 
 * Comprehensive form for editing provider details.
 * Handles all provider fields including core info, business hours,
 * images, booking system, and more.
 */

import { useState, useEffect } from 'react'
import BusinessHoursEditor from './BusinessHoursEditor'
import ProviderImageUpload from './ProviderImageUpload'
import type { ProviderRow } from '../../types/admin'
import { CATEGORY_OPTIONS } from '../../hooks/useAdminProviders'

interface ProviderEditFormProps {
  provider: ProviderRow
  providers: ProviderRow[]
  setProviders: React.Dispatch<React.SetStateAction<ProviderRow[]>>
  onSave: (provider: ProviderRow) => void
  onDelete: (providerId: string) => void
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>, providerId: string) => void
  onImageRemove: (providerId: string, imageUrl: string) => void
  onToggleBooking: (providerId: string, currentStatus: boolean) => void
  savingProvider: boolean
  uploadingImages: boolean
  confirmDeleteProviderId: string | null
  setConfirmDeleteProviderId: (id: string | null) => void
  error: string | null
  message: string | null
  retryProvider: ProviderRow | null
  onRetry: () => void
}

/**
 * ProviderEditForm Component
 * 
 * Displays a comprehensive form for editing all provider fields.
 * Includes validation, error handling, and responsive design.
 * Uses local state for text inputs to prevent slow typing.
 */
export default function ProviderEditForm({
  provider,
  providers,
  setProviders,
  onSave,
  onDelete,
  onImageUpload,
  onImageRemove,
  onToggleBooking,
  savingProvider,
  uploadingImages,
  confirmDeleteProviderId,
  setConfirmDeleteProviderId,
  error,
  message,
  retryProvider,
  onRetry
}: ProviderEditFormProps) {
  // Local state for text inputs to prevent slow typing
  const [localDescription, setLocalDescription] = useState(provider.description || '')
  
  // Sync local state when provider changes
  useEffect(() => {
    setLocalDescription(provider.description || '')
  }, [provider.id, provider.description])
  
  // Helper function to update a single provider field
  const updateField = (field: keyof ProviderRow, value: any) => {
    setProviders(prev => prev.map(p => 
      p.id === provider.id ? { ...p, [field]: value } : p
    ))
  }

  // Helper function to update nested social_links
  const updateSocialLink = (platform: string, value: string) => {
    setProviders(prev => prev.map(p => 
      p.id === provider.id 
        ? { ...p, social_links: { ...p.social_links, [platform]: value } }
        : p
    ))
  }
  
  // Helper to update description with local state (only on blur for performance)
  const handleDescriptionChange = (value: string) => {
    if (!provider.is_member && value.length > 200) return
    setLocalDescription(value)
  }
  
  // Update description in global state only on blur (not on every keystroke)
  const handleDescriptionBlur = () => {
    if (localDescription !== provider.description) {
      updateField('description', localDescription)
    }
  }
  
  // Helper to toggle contact methods
  const toggleContactMethod = (method: 'enable_calendar_booking' | 'enable_call_contact' | 'enable_email_contact') => {
    const currentValue = provider[method]
    updateField(method, !currentValue)
  }

  // Calculate plan duration
  const getPlanDuration = () => {
    if (!provider.featured_since) return null
    
    const startDate = new Date(provider.featured_since)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)
    
    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''}`
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-6 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            Editing: {provider.name}
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            {provider.subscription_type ? 'Featured Account' : 'Free Account'} • 
            Category: {provider.category_key}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Plan Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Plan Type:</label>
            <select 
              value={provider.subscription_type || 'free'} 
              onChange={(e) => {
                const newPlan = e.target.value
                const now = new Date().toISOString()
                setProviders(prev => prev.map(p => 
                  p.id === provider.id ? {
                    ...p, 
                    subscription_type: newPlan === 'free' ? null : newPlan,
                    is_member: newPlan !== 'free',
                    is_featured: newPlan !== 'free',
                    featured_since: newPlan !== 'free' ? (p.featured_since || now) : null,
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
          
          {/* Plan Duration Display */}
          {provider.subscription_type && provider.featured_since && (
            <div className="text-xs text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
              Featured since: {new Date(provider.featured_since).toLocaleDateString()}
              {provider.subscription_type && (
                <span className="ml-1">
                  ({provider.subscription_type === 'monthly' ? 'Monthly' : 'Yearly'} plan)
                </span>
              )}
              {getPlanDuration() && (
                <span className="ml-1 text-green-600 font-medium">
                  ({getPlanDuration()} ago)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Core Business Information */}
        <div>
          <h4 className="text-md font-medium text-neutral-800 mb-4">Core Business Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Business Name *
              </label>
              <input 
                value={provider.name || ''} 
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="Enter business name"
              />
            </div>
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Category *
              </label>
              <select 
                value={provider.category_key} 
                onChange={(e) => updateField('category_key', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.name}</option>
                ))}
              </select>
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Phone Number
              </label>
              <input 
                value={provider.phone || ''} 
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="(619) 123-4567"
              />
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email Address
              </label>
              <input 
                value={provider.email || ''} 
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="business@example.com"
              />
            </div>
            
            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Website
              </label>
              <input 
                value={provider.website || ''} 
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="https://www.example.com"
              />
            </div>
            
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Address
              </label>
              <input 
                value={provider.address || ''} 
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
              ({localDescription.length}/{provider.is_member ? '500' : '200'} characters)
            </span>
          </label>
          <textarea
            value={localDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            onBlur={handleDescriptionBlur}
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
              !provider.is_member && localDescription.length > 200
                ? 'border-red-300 focus:ring-red-500'
                : 'border-neutral-300 focus:ring-neutral-500'
            }`}
            placeholder="Tell customers about your business..."
            maxLength={provider.is_member ? 500 : 200}
          />
        </div>

        {/* Bonita Residents Discount */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Special Discount for Bonita Residents
          </label>
          <input 
            value={provider.bonita_resident_discount || ''} 
            onChange={(e) => updateField('bonita_resident_discount', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="e.g., 10% off for Bonita residents, Free consultation for locals"
          />
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Specialties
            <span className="text-xs text-neutral-500 ml-2">(Comma-separated)</span>
          </label>
          <input 
            defaultValue={(provider.specialties || []).join(', ')} 
            key={`specialties-${provider.id}`}
            onBlur={(e) => updateField('specialties', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Type freely and press Tab or click outside to save
          </p>
        </div>

        {/* Service Areas */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Areas You Serve
          </label>
          <input 
            defaultValue={(provider.service_areas || []).join(', ')} 
            key={`service-areas-${provider.id}`}
            onBlur={(e) => updateField('service_areas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="Bonita, Chula Vista, San Diego, National City"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Type comma-separated areas. Changes save when you leave the field.
          </p>
        </div>

        {/* Social Media Links - Featured Only */}
        <div className={!provider.is_member ? 'opacity-50 pointer-events-none' : ''}>
          <h4 className="text-md font-medium text-neutral-800 mb-4">
            Social Media Links
            {!provider.is_member && (
              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
            )}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
              <input 
                value={provider.social_links?.facebook || ''} 
                onChange={(e) => updateSocialLink('facebook', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="https://facebook.com/yourbusiness"
                disabled={!provider.is_member}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
              <input 
                value={provider.social_links?.instagram || ''} 
                onChange={(e) => updateSocialLink('instagram', e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                placeholder="https://instagram.com/yourbusiness"
                disabled={!provider.is_member}
              />
            </div>
          </div>
        </div>

        {/* Business Hours - Featured Only */}
        <BusinessHoursEditor
          provider={provider}
          onChange={(businessHours) => updateField('business_hours', businessHours)}
          accentColor="neutral"
        />

        {/* Image Upload */}
        <ProviderImageUpload
          provider={provider}
          onUpload={(e) => onImageUpload(e, provider.id)}
          onRemove={(url) => onImageRemove(provider.id, url)}
          uploading={uploadingImages}
          accentColor="neutral"
        />

        {/* Booking System - Featured Only */}
        <div className={!provider.is_member ? 'opacity-50 pointer-events-none' : ''}>
          <h4 className="text-md font-medium text-neutral-800 mb-4">
            Booking System Configuration
            {!provider.is_member && (
              <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
            )}
          </h4>
          
          {!provider.is_member && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Upgrade to Featured</strong> to enable online booking and appointment scheduling.
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Enable Booking Toggle */}
            <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-800">
                    Online Booking System
                  </span>
                  {provider.booking_enabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 mt-1">
                  {provider.booking_enabled 
                    ? 'Customers can book appointments through your listing'
                    : 'Enable to allow customers to book appointments or reservations online'
                  }
                </p>
              </div>
              
              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => onToggleBooking(provider.id, provider.booking_enabled === true)}
                disabled={!provider.is_member}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  provider.booking_enabled ? 'bg-blue-600' : 'bg-neutral-300'
                }`}
                aria-label="Toggle booking system"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    provider.booking_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Contact Methods - Always visible when booking system section is shown */}
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
                      {provider.enable_calendar_booking && (
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
                    onClick={() => toggleContactMethod('enable_calendar_booking')}
                    disabled={!provider.is_member || !provider.booking_enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      provider.enable_calendar_booking ? 'bg-blue-600' : 'bg-neutral-300'
                    }`}
                    aria-label="Toggle calendar booking"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        provider.enable_calendar_booking ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Phone Contact Toggle */}
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800">📞 Phone Contact</span>
                      {provider.enable_call_contact && (
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
                    onClick={() => toggleContactMethod('enable_call_contact')}
                    disabled={!provider.is_member || !provider.booking_enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      provider.enable_call_contact ? 'bg-blue-600' : 'bg-neutral-300'
                    }`}
                    aria-label="Toggle phone contact"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        provider.enable_call_contact ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Email Contact Toggle */}
                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800">✉️ Email Contact</span>
                      {provider.enable_email_contact && (
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
                    onClick={() => toggleContactMethod('enable_email_contact')}
                    disabled={!provider.is_member || !provider.booking_enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      provider.enable_email_contact ? 'bg-blue-600' : 'bg-neutral-300'
                    }`}
                    aria-label="Toggle email contact"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        provider.enable_email_contact ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Info message when booking is disabled */}
                {!provider.booking_enabled && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 Enable the booking system above to activate these contact methods
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Type */}
            {provider.booking_enabled && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Booking Type
                </label>
                <select 
                  value={provider.booking_type || ''} 
                  onChange={(e) => updateField('booking_type', e.target.value || null)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  disabled={!provider.is_member}
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
            {provider.booking_enabled && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Booking Instructions
                </label>
                <textarea
                  value={provider.booking_instructions || ''}
                  onChange={(e) => updateField('booking_instructions', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="e.g., Please call ahead for same-day appointments, Book at least 24 hours in advance"
                  disabled={!provider.is_member}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Instructions shown to customers when they try to book
                </p>
              </div>
            )}

            {/* External Booking URL */}
            {provider.booking_enabled && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  External Booking URL (Optional)
                </label>
                <input 
                  value={provider.booking_url || ''} 
                  onChange={(e) => updateField('booking_url', e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
                  placeholder="https://calendly.com/yourbusiness"
                  disabled={!provider.is_member}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  If you use an external booking platform, enter the URL here
                </p>
              </div>
            )}

            {/* Booking Preview */}
            {provider.booking_enabled && provider.is_member && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Booking Summary</h5>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Type:</strong> {provider.booking_type || 'Not specified'}</p>
                  {provider.booking_url && (
                    <p><strong>External URL:</strong> <a href={provider.booking_url} target="_blank" rel="noopener noreferrer" className="underline">{provider.booking_url}</a></p>
                  )}
                  {provider.booking_instructions && (
                    <p><strong>Instructions:</strong> {provider.booking_instructions}</p>
                  )}
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <p className="font-medium mb-1">Contact Methods:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {provider.enable_calendar_booking && <li>Calendar booking enabled</li>}
                      {provider.enable_call_contact && <li>Phone contact enabled</li>}
                      {provider.enable_email_contact && <li>Email contact enabled</li>}
                      {!provider.enable_calendar_booking && !provider.enable_call_contact && !provider.enable_email_contact && (
                        <li className="text-amber-700">⚠️ No contact methods enabled</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Tags</label>
          <input 
            defaultValue={(provider.tags || []).join(', ')} 
            key={`tags-${provider.id}`}
            onBlur={(e) => updateField('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="professional, reliable, local, certified"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Type comma-separated values. Changes save when you click outside.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onSave(provider)} 
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
              if (confirmDeleteProviderId === provider.id) {
                onDelete(provider.id)
              } else {
                setConfirmDeleteProviderId(provider.id)
              }
            }}
            className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          >
            {confirmDeleteProviderId === provider.id ? 'Confirm Delete' : 'Delete Provider'}
          </button>
          {confirmDeleteProviderId === provider.id && (
            <button 
              onClick={() => setConfirmDeleteProviderId(null)} 
              className="px-4 py-2 text-neutral-500 hover:text-neutral-700 underline"
            >
              Cancel
            </button>
          )}
        </div>
        
        <div className="text-sm text-neutral-500">
          Last updated: {provider.updated_at ? new Date(provider.updated_at).toLocaleString() : 'Never'}
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

      {/* Error Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
            {retryProvider && (
              <button
                onClick={onRetry}
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
}

