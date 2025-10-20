import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER METADATA FIELDS
 * 
 * Step 4 of gradual Admin.tsx extraction.
 * Renders specialties, service areas, and social media links.
 * 
 * Features:
 * - Specialties (comma-separated, saves on blur)
 * - Service Areas (comma-separated, saves on blur)
 * - Social Media Links (Facebook, Instagram - featured only)
 * - Still uses parent state (performance optimization in Step 5)
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

  return (
    <div className="space-y-6">
      {/* Specialties */}
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

      {/* Service Areas */}
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
              value={provider.social_links?.facebook || ''} 
              onChange={(e) => {
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
              value={provider.social_links?.instagram || ''} 
              onChange={(e) => {
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

