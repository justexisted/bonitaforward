import { useState, useEffect } from 'react'
import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER METADATA FIELDS - OPTIMIZED ⚡
 * 
 * Step 5: Performance optimization complete!
 * Uses local state for instant typing with no lag.
 * Only updates parent component on blur/save events.
 * 
 * Features:
 * - Specialties (comma-separated, saves on blur)
 * - Service Areas (comma-separated, saves on blur)
 * - Social Media Links (Facebook, Instagram - featured only)
 * - Local state prevents parent re-renders on every keystroke
 */

interface ProviderMetadataFieldsProps {
  provider: ProviderRow
  onUpdate: (field: keyof ProviderRow, value: any) => void
}

export function ProviderMetadataFields({ 
  provider, 
  onUpdate 
}: ProviderMetadataFieldsProps) {
  const isFeatured = provider.is_member

  // Local state for instant typing
  const [localFacebook, setLocalFacebook] = useState(provider.social_links?.facebook || '')
  const [localInstagram, setLocalInstagram] = useState(provider.social_links?.instagram || '')

  // Sync local state when provider changes
  useEffect(() => {
    setLocalFacebook(provider.social_links?.facebook || '')
    setLocalInstagram(provider.social_links?.instagram || '')
  }, [provider.id])

  return (
    <div className="space-y-6">
      {/* Specialties - Already uses defaultValue + onBlur pattern (optimized) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Specialties
          <span className="text-xs text-neutral-500 ml-2">
            (Comma-separated)
          </span>
        </label>
        <input 
          defaultValue={(provider.specialties || []).join(', ')} 
          key={`specialties-${provider.id}`}
          onBlur={(e) => {
            const specialties = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            onUpdate('specialties', specialties)
          }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
          placeholder="e.g., Kitchen Remodeling, Solar Installation, Wedding Photography, Tax Planning"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Type freely and press Tab or click outside to save. Changes apply when you leave the field.
        </p>
      </div>

      {/* Service Areas - Already uses defaultValue + onBlur pattern (optimized) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Areas You Serve
        </label>
        <input 
          defaultValue={(provider.service_areas || []).join(', ')} 
          key={`service-areas-${provider.id}`}
          onBlur={(e) => {
            const serviceAreas = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            onUpdate('service_areas', serviceAreas)
          }}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
          placeholder="Bonita, Chula Vista, San Diego, National City"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Type comma-separated areas. Changes save when you leave the field.
        </p>
      </div>

      {/* Social Media Links - Featured Only */}
      <div className={!isFeatured ? 'opacity-50 pointer-events-none' : ''}>
        <h4 className="text-md font-medium text-neutral-800 mb-4">
          Social Media Links
          {!isFeatured && (
            <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
          )}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Facebook */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
            <input 
              value={localFacebook} 
              onChange={(e) => setLocalFacebook(e.target.value)}
              onBlur={(e) => {
                onUpdate('social_links', { 
                  ...provider.social_links, 
                  facebook: e.target.value 
                })
              }}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
              placeholder="https://facebook.com/yourbusiness"
              disabled={!isFeatured}
            />
          </div>
          
          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
            <input 
              value={localInstagram} 
              onChange={(e) => setLocalInstagram(e.target.value)}
              onBlur={(e) => {
                onUpdate('social_links', { 
                  ...provider.social_links, 
                  instagram: e.target.value 
                })
              }}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
              placeholder="https://instagram.com/yourbusiness"
              disabled={!isFeatured}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

