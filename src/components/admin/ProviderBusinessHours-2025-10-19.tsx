import { useState, useEffect } from 'react'
import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER BUSINESS HOURS - OPTIMIZED ⚡
 * 
 * Step 7 of gradual Admin.tsx extraction.
 * Manages provider business hours (day-by-day editor).
 * 
 * Features:
 * - Enable/disable business hours
 * - Day-by-day hours editor (Mon-Sun)
 * - Quick fill button (9 AM - 5 PM all days)
 * - Featured-only section
 * - Local state for instant typing
 * - Auto-save on blur
 * 
 * Future enhancements:
 * - Time picker UI (replace text input)
 * - Copy hours to other days
 * - Holiday hours
 * - Special event hours
 */

interface ProviderBusinessHoursProps {
  provider: ProviderRow
  onUpdate: (field: 'business_hours', value: Record<string, string> | null) => void
}

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
] as const

const DEFAULT_HOURS = {
  monday: '9:00 AM - 5:00 PM',
  tuesday: '9:00 AM - 5:00 PM',
  wednesday: '9:00 AM - 5:00 PM',
  thursday: '9:00 AM - 5:00 PM',
  friday: '9:00 AM - 5:00 PM',
  saturday: '10:00 AM - 4:00 PM',
  sunday: 'Closed'
}

const QUICK_FILL_HOURS = {
  monday: '9:00 AM - 5:00 PM',
  tuesday: '9:00 AM - 5:00 PM',
  wednesday: '9:00 AM - 5:00 PM',
  thursday: '9:00 AM - 5:00 PM',
  friday: '9:00 AM - 5:00 PM',
  saturday: '9:00 AM - 5:00 PM',
  sunday: '9:00 AM - 5:00 PM'
}

export function ProviderBusinessHours({ 
  provider, 
  onUpdate 
}: ProviderBusinessHoursProps) {
  const isFeatured = provider.is_member
  const hasBusinessHours = provider.business_hours !== null

  // Local state for each day's hours (for instant typing)
  const [localHours, setLocalHours] = useState<Record<string, string>>(
    provider.business_hours || DEFAULT_HOURS
  )

  // Sync local state when provider changes
  useEffect(() => {
    if (provider.business_hours) {
      setLocalHours(provider.business_hours)
    }
  }, [provider.id, provider.business_hours])

  const handleToggleBusinessHours = (enabled: boolean) => {
    if (enabled) {
      const hours = DEFAULT_HOURS
      setLocalHours(hours)
      onUpdate('business_hours', hours)
    } else {
      onUpdate('business_hours', null)
    }
  }

  const handleQuickFill = () => {
    setLocalHours(QUICK_FILL_HOURS)
    onUpdate('business_hours', QUICK_FILL_HOURS)
  }

  const handleDayChange = (day: string, value: string) => {
    setLocalHours(prev => ({ ...prev, [day]: value }))
  }

  const handleDayBlur = (day: string, value: string) => {
    const updatedHours = { ...localHours, [day]: value }
    onUpdate('business_hours', updatedHours)
  }

  return (
    <div className={!isFeatured ? 'opacity-50 pointer-events-none' : ''}>
      <h4 className="text-md font-medium text-neutral-800 mb-4">
        Business Hours
        {!isFeatured && (
          <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
        )}
      </h4>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`enable-business-hours-${provider.id}`}
              checked={hasBusinessHours}
              onChange={(e) => handleToggleBusinessHours(e.target.checked)}
              disabled={!isFeatured}
              className="rounded border-neutral-300 text-neutral-600 focus:ring-neutral-500"
            />
            <label 
              htmlFor={`enable-business-hours-${provider.id}`} 
              className="text-sm font-medium text-neutral-700"
            >
              Set Business Hours
            </label>
          </div>
          
          {/* Quick Fill Button - Only show when business hours are enabled */}
          {isFeatured && hasBusinessHours && (
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors font-medium"
            >
              🕐 Quick Fill All (9 AM - 5 PM)
            </button>
          )}
        </div>
        
        {isFeatured && hasBusinessHours && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-700 w-20">
                  {label}:
                </label>
                <input
                  type="text"
                  value={localHours[key] || ''}
                  onChange={(e) => handleDayChange(key, e.target.value)}
                  onBlur={(e) => handleDayBlur(key, e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  placeholder="e.g., 9:00 AM - 5:00 PM"
                  disabled={!isFeatured}
                />
              </div>
            ))}
          </div>
        )}
        
        {!isFeatured && (
          <p className="text-xs text-neutral-500 bg-neutral-50 p-2 rounded">
            Business hours are only available for featured accounts. Upgrade to a featured plan to set business hours.
          </p>
        )}
      </div>
    </div>
  )
}

