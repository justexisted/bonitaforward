import { useState, useEffect } from 'react'
import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER CORE INFO FIELDS - OPTIMIZED ⚡
 * 
 * Step 5: Performance optimization complete!
 * Uses local state for instant typing with no lag.
 * Only updates parent component on blur/save events.
 * 
 * This prevents the massive Admin.tsx component from re-rendering
 * on every keystroke, fixing the typing lag issue.
 */

interface ProviderCoreInfoFieldsProps {
  provider: ProviderRow
  catOptions: Array<{ key: string; name: string }>
  onUpdate: (field: keyof ProviderRow, value: any) => void
}

export function ProviderCoreInfoFields({ 
  provider, 
  catOptions, 
  onUpdate 
}: ProviderCoreInfoFieldsProps) {
  // Local state for instant typing (no parent re-renders!)
  const [localName, setLocalName] = useState(provider.name || '')
  const [localPhone, setLocalPhone] = useState(provider.phone || '')
  const [localEmail, setLocalEmail] = useState(provider.email || '')
  const [localWebsite, setLocalWebsite] = useState(provider.website || '')
  const [localAddress, setLocalAddress] = useState(provider.address || '')

  // Sync local state when provider changes (e.g., switching between providers)
  useEffect(() => {
    setLocalName(provider.name || '')
    setLocalPhone(provider.phone || '')
    setLocalEmail(provider.email || '')
    setLocalWebsite(provider.website || '')
    setLocalAddress(provider.address || '')
  }, [provider.id]) // Only update when switching to a different provider

  return (
    <div>
      <h4 className="text-md font-medium text-neutral-800 mb-4">Core Business Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Business Name *
          </label>
          <input 
            value={localName} 
            onChange={(e) => setLocalName(e.target.value)} // Instant local update
            onBlur={(e) => onUpdate('name', e.target.value)} // Parent update on blur
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="Enter business name"
          />
        </div>

        {/* Category - Updates immediately (dropdowns are fast) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Category *
          </label>
          <select 
            value={provider.category_key} 
            onChange={(e) => onUpdate('category_key', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            {catOptions.map((opt) => (
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
            value={localPhone} 
            onChange={(e) => setLocalPhone(e.target.value)}
            onBlur={(e) => onUpdate('phone', e.target.value)}
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
            value={localEmail} 
            onChange={(e) => setLocalEmail(e.target.value)}
            onBlur={(e) => onUpdate('email', e.target.value)}
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
            value={localWebsite} 
            onChange={(e) => setLocalWebsite(e.target.value)}
            onBlur={(e) => onUpdate('website', e.target.value)}
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
            value={localAddress} 
            onChange={(e) => setLocalAddress(e.target.value)}
            onBlur={(e) => onUpdate('address', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="123 Main St, Bonita, CA 91902"
          />
        </div>
      </div>
    </div>
  )
}

