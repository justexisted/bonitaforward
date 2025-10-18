/**
 * Business Hours Editor Component
 * 
 * Manages weekly business hours for providers.
 * Only available for featured accounts.
 */

import type { ProviderRow } from '../../types/admin'

const DEFAULT_HOURS = {
  monday: '9:00 AM - 5:00 PM',
  tuesday: '9:00 AM - 5:00 PM',
  wednesday: '9:00 AM - 5:00 PM',
  thursday: '9:00 AM - 5:00 PM',
  friday: '9:00 AM - 5:00 PM',
  saturday: '10:00 AM - 4:00 PM',
  sunday: 'Closed'
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
] as const

interface BusinessHoursEditorProps {
  provider: ProviderRow
  onChange: (businessHours: Record<string, string> | null) => void
  disabled?: boolean
  accentColor?: 'neutral' | 'green'
}

/**
 * BusinessHoursEditor Component
 * 
 * Displays a checkbox to enable/disable business hours
 * and inputs for each day of the week when enabled.
 */
export default function BusinessHoursEditor({
  provider,
  onChange,
  disabled = false,
  accentColor = 'neutral'
}: BusinessHoursEditorProps) {
  const isEnabled = provider.business_hours !== null
  const isFeatured = provider.is_member === true
  const isDisabled = disabled || !isFeatured
  
  // Color classes based on accent
  const colors = {
    neutral: {
      text: 'text-neutral-700',
      textSecondary: 'text-neutral-600',
      border: 'border-neutral-300',
      focus: 'focus:ring-neutral-500',
      checkbox: 'text-neutral-600',
      bg: 'bg-neutral-50'
    },
    green: {
      text: 'text-green-700',
      textSecondary: 'text-green-600',
      border: 'border-green-300',
      focus: 'focus:ring-green-500',
      checkbox: 'text-green-600',
      bg: 'bg-green-50'
    }
  }
  
  const colorClasses = colors[accentColor]

  const handleToggle = (checked: boolean) => {
    if (isDisabled) return
    
    if (checked) {
      // Initialize with default hours
      onChange(DEFAULT_HOURS)
    } else {
      // Clear business hours
      onChange(null)
    }
  }

  const handleDayChange = (day: string, value: string) => {
    if (isDisabled || !provider.business_hours) return
    
    onChange({
      ...provider.business_hours,
      [day]: value
    })
  }

  return (
    <div className={isDisabled ? 'opacity-50 pointer-events-none' : ''}>
      <h4 className={`text-md font-medium ${colorClasses.text} mb-4`}>
        Business Hours
        {!isFeatured && (
          <span className="text-sm text-amber-600 ml-2">(Featured accounts only)</span>
        )}
      </h4>
      
      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id={`enable-business-hours-${provider.id}`}
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={isDisabled}
            className={`rounded ${colorClasses.border} ${colorClasses.checkbox} ${colorClasses.focus}`}
          />
          <label 
            htmlFor={`enable-business-hours-${provider.id}`} 
            className={`text-sm font-medium ${colorClasses.text}`}
          >
            Set Business Hours
          </label>
        </div>
        
        {/* Hours Inputs */}
        {isFeatured && isEnabled && provider.business_hours && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DAYS_OF_WEEK.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <label className={`text-sm font-medium ${colorClasses.text} w-20`}>
                  {label}:
                </label>
                <input
                  type="text"
                  value={provider.business_hours?.[key] || ''}
                  onChange={(e) => handleDayChange(key, e.target.value)}
                  className={`flex-1 rounded-lg border ${colorClasses.border} px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${colorClasses.focus}`}
                  placeholder="e.g., 9:00 AM - 5:00 PM"
                  disabled={isDisabled}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Featured Account Required Message */}
        {!isFeatured && (
          <p className={`text-xs ${colorClasses.textSecondary} ${colorClasses.bg} p-2 rounded`}>
            Business hours are only available for featured accounts. Upgrade to a featured plan to set business hours.
          </p>
        )}
      </div>
    </div>
  )
}

