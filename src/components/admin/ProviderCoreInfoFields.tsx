import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER CORE INFO FIELDS
 * 
 * Step 1 of gradual Admin.tsx extraction.
 * This component renders the core business information fields (name, category, contact info).
 * Still uses parent state via props - performance optimization comes in Step 5.
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
            value={provider.name || ''} 
            onChange={(e) => onUpdate('name', e.target.value)}
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
            value={provider.phone || ''} 
            onChange={(e) => onUpdate('phone', e.target.value)}
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
            onChange={(e) => onUpdate('email', e.target.value)}
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
            onChange={(e) => onUpdate('website', e.target.value)}
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
            onChange={(e) => onUpdate('address', e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
            placeholder="123 Main St, Bonita, CA 91902"
          />
        </div>
      </div>
    </div>
  )
}

