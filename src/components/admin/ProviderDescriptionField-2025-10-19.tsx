import { useState, useEffect } from 'react'
import type { ProviderRow } from '../../types/admin'

/**
 * PROVIDER DESCRIPTION FIELD - OPTIMIZED ⚡
 * 
 * Step 5: Performance optimization complete!
 * Uses local state for instant typing with no lag.
 * Only updates parent component on blur/save events.
 * 
 * Features:
 * - Character limit: 200 for free, 500 for featured
 * - Real-time character counter
 * - Red border when exceeding limit
 * - Local state prevents parent re-renders on every keystroke
 */

interface ProviderDescriptionFieldProps {
  provider: ProviderRow
  onUpdate: (value: string) => void
}

export function ProviderDescriptionField({ 
  provider, 
  onUpdate 
}: ProviderDescriptionFieldProps) {
  // Local state for instant typing
  const [localDescription, setLocalDescription] = useState(provider.description || '')

  // Sync local state when provider changes
  useEffect(() => {
    setLocalDescription(provider.description || '')
  }, [provider.id])

  const maxLength = provider.is_member ? 500 : 200
  const currentLength = localDescription.length
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
        value={localDescription}
        onChange={(e) => {
          const newDescription = e.target.value
          // Prevent typing if over limit for free accounts
          if (!provider.is_member && newDescription.length > 200) {
            return
          }
          setLocalDescription(newDescription) // Update local state instantly
        }}
        onBlur={(e) => onUpdate(e.target.value)} // Save to parent on blur
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

