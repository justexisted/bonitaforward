import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER COUPON FIELDS
 * 
 * Step 3 of gradual Admin.tsx extraction.
 * Renders the complete coupon system for featured providers.
 * 
 * Features:
 * - Coupon code (auto-uppercase)
 * - Discount amount/type
 * - Expiration date
 * - Description
 * - Live preview
 * - Featured-only (disabled for free accounts)
 * - Still uses parent state (performance optimization in Step 5)
 */

interface ProviderCouponFieldsProps {
  provider: ProviderRow
  onUpdate: (field: keyof ProviderRow, value: any) => void
}

export function ProviderCouponFields({ 
  provider, 
  onUpdate 
}: ProviderCouponFieldsProps) {
  const isFeatured = provider.is_member

  return (
    <div className={!isFeatured ? 'opacity-50 pointer-events-none' : ''}>
      <h4 className="text-md font-medium text-neutral-800 mb-4">
        Coupon System
        {!isFeatured && (
          <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
        )}
      </h4>
      
      {!isFeatured && (
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
            value={provider.coupon_code || ''} 
            onChange={(e) => onUpdate('coupon_code', e.target.value.toUpperCase())}
            disabled={!isFeatured}
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
            value={provider.coupon_discount || ''} 
            onChange={(e) => onUpdate('coupon_discount', e.target.value)}
            disabled={!isFeatured}
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
            value={provider.coupon_expires_at ? new Date(provider.coupon_expires_at).toISOString().slice(0, 16) : ''} 
            onChange={(e) => onUpdate('coupon_expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
            disabled={!isFeatured}
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
            value={provider.coupon_description || ''}
            onChange={(e) => onUpdate('coupon_description', e.target.value)}
            disabled={!isFeatured}
            rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:bg-neutral-100"
            placeholder="Additional details about the coupon (terms, conditions, etc.)"
          />
          <p className="text-xs text-neutral-500 mt-1">Additional details about the offer</p>
        </div>
      </div>

      {/* Coupon Preview */}
      {provider.coupon_code && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-600 uppercase">Preview</div>
              <div className="text-2xl font-bold text-neutral-900 font-mono mt-1">
                {provider.coupon_code}
              </div>
              <div className="text-lg font-semibold text-green-700 mt-1">
                {provider.coupon_discount || 'Discount not set'}
              </div>
              {provider.coupon_description && (
                <div className="text-sm text-neutral-600 mt-2">
                  {provider.coupon_description}
                </div>
              )}
              {provider.coupon_expires_at && (
                <div className="text-xs text-red-600 mt-2 font-medium">
                  Expires: {new Date(provider.coupon_expires_at).toLocaleDateString('en-US', { 
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
  )
}

