import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER DESCRIPTION FIELD
 * 
 * Step 2 of gradual Admin.tsx extraction.
 * Renders the business description textarea with character counter.
 * 
 * Features:
 * - Character limit: 200 for free, 500 for featured
 * - Real-time character counter
 * - Red border when exceeding limit
 * - Still uses parent state (performance optimization in Step 5)
 */

interface ProviderDescriptionFieldProps {
  provider: ProviderRow
  onUpdate: (value: string) => void
}

export function ProviderDescriptionField({ 
  provider, 
  onUpdate 
}: ProviderDescriptionFieldProps) {
  const maxLength = provider.is_member ? 500 : 200
  const currentLength = provider.description?.length || 0
  const isOverLimit = !provider.is_member && currentLength > 200

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        Description
        <span className="text-xs text-neutral-500 ml-2">
          ({currentLength}/{maxLength} characters)
        </span>
      </label>
      <textarea
        value={provider.description || ''}
        onChange={(e) => {
          const newDescription = e.target.value
          // Prevent typing if over limit for free accounts
          if (!provider.is_member && newDescription.length > 200) {
            return
          }
          onUpdate(newDescription)
        }}
        rows={4}
        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
          isOverLimit
            ? 'border-red-300 focus:ring-red-500'
            : 'border-neutral-300 focus:ring-neutral-500'
        }`}
        placeholder="Tell customers about your business..."
        maxLength={maxLength}
      />
    </div>
  )
}

