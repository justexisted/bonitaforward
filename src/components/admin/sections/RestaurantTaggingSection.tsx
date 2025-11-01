/**
 * RESTAURANT TAGGING SECTION
 * 
 * Allows admins to quickly tag restaurants/cafes with:
 * - Price Range ($, $$, $$$, $$$$)
 * - Cuisine Type (american, italian, mexican, asian, mediterranean)
 * - Occasions (casual, date-night, family, business, celebration, quick-bite)
 * - Dietary Options (vegetarian, vegan, gluten-free, keto)
 * 
 * Tags are automatically added to the provider's tags array and match
 * the funnel question IDs for accurate matching in the booking flow.
 */

import { useState, useMemo } from 'react'
import type { ProviderRow } from '../../../types/admin'

interface RestaurantTaggingSectionProps {
  providers: ProviderRow[]
  onUpdateProvider: (providerId: string, tags: string[]) => Promise<void>
  loading?: boolean
}

// Funnel question options matching src/utils/funnelQuestions.ts
const OCCASION_OPTIONS = [
  { id: 'casual', label: 'Casual dining' },
  { id: 'date-night', label: 'Date night' },
  { id: 'family', label: 'Family meal' },
  { id: 'business', label: 'Business meeting' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'quick-bite', label: 'Quick bite' },
]

const CUISINE_OPTIONS = [
  { id: 'american', label: 'American' },
  { id: 'italian', label: 'Italian' },
  { id: 'mexican', label: 'Mexican' },
  { id: 'asian', label: 'Asian' },
  { id: 'mediterranean', label: 'Mediterranean' },
]

const PRICE_RANGE_OPTIONS = [
  { id: 'budget', label: '$ (Budget-friendly)', tagValue: '$' },
  { id: 'moderate', label: '$$ (Moderate)', tagValue: '$$' },
  { id: 'upscale', label: '$$$ (Upscale)', tagValue: '$$$' },
  { id: 'fine-dining', label: '$$$$ (Fine dining)', tagValue: '$$$$' },
]

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'keto', label: 'Keto' },
]

export function RestaurantTaggingSection({
  providers,
  onUpdateProvider,
  loading = false
}: RestaurantTaggingSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  
  // Track pending changes (unsaved selections)
  const [pendingChanges, setPendingChanges] = useState<Map<string, {
    priceRange?: string
    cuisine?: string
    occasions?: string[]
    dietary?: string[]
  }>>(new Map())

  // Filter to restaurants-cafes only
  const restaurants = useMemo(() => {
    return providers.filter(p => p.category_key === 'restaurants-cafes')
  }, [providers])

  // Filter by search term
  const filteredRestaurants = useMemo(() => {
    if (!searchTerm.trim()) return restaurants
    const term = searchTerm.toLowerCase()
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(term) ||
      r.description?.toLowerCase().includes(term) ||
      r.tags?.some(tag => tag.toLowerCase().includes(term))
    )
  }, [restaurants, searchTerm])

  // Track pending changes locally (doesn't save to database yet)
  const trackPendingChange = (
    providerId: string,
    updates: {
      priceRange?: string
      cuisine?: string
      occasions?: string[]
      dietary?: string[]
    }
  ) => {
    setPendingChanges(prev => {
      const next = new Map(prev)
      const existing = next.get(providerId) || {}
      
      // Merge new updates with existing pending changes
      const merged = {
        ...existing,
        ...(updates.priceRange !== undefined && { priceRange: updates.priceRange }),
        ...(updates.cuisine !== undefined && { cuisine: updates.cuisine }),
        ...(updates.occasions !== undefined && { occasions: updates.occasions }),
        ...(updates.dietary !== undefined && { dietary: updates.dietary }),
      }
      
      // Remove empty changes
      const hasChanges = Object.keys(merged).some(key => {
        const value = merged[key as keyof typeof merged]
        return value !== undefined && 
               value !== '' && 
               (Array.isArray(value) ? value.length > 0 : true)
      })
      
      if (hasChanges) {
        next.set(providerId, merged)
      } else {
        next.delete(providerId)
      }
      
      return next
    })
  }

  // Apply pending changes to tags and save to database
  const applyPendingChangesToTags = (
    provider: ProviderRow,
    pending: {
      priceRange?: string
      cuisine?: string
      occasions?: string[]
      dietary?: string[]
    }
  ): string[] => {
    let tags = [...(provider.tags || [])]

    // If price range is being updated, remove only old price range tags
    if (pending.priceRange !== undefined) {
      tags = tags.filter(t => {
        const tagLower = t.toLowerCase()
        return !['$', '$$', '$$$', '$$$$', 'budget', 'moderate', 'upscale', 'fine-dining'].includes(tagLower)
      })
      // Add new price range tag
      if (pending.priceRange) {
        const priceOption = PRICE_RANGE_OPTIONS.find(o => o.id === pending.priceRange)
        if (priceOption) {
          tags.push(priceOption.tagValue)
        }
      }
    }

    // If cuisine is being updated, remove only old cuisine tags
    if (pending.cuisine !== undefined) {
      tags = tags.filter(t => {
        const tagLower = t.toLowerCase()
        return !['american', 'italian', 'mexican', 'asian', 'mediterranean'].includes(tagLower)
      })
      // Add new cuisine tag
      if (pending.cuisine) {
        tags.push(pending.cuisine)
      }
    }

    // If occasions are being updated, remove only old occasion tags
    if (pending.occasions !== undefined) {
      tags = tags.filter(t => {
        const tagLower = t.toLowerCase()
        return !['casual', 'date-night', 'family', 'business', 'celebration', 'quick-bite'].includes(tagLower)
      })
      // Add new occasion tags
      pending.occasions.forEach(occasion => {
        tags.push(occasion)
      })
    }

    // If dietary options are being updated, remove only old dietary tags
    if (pending.dietary !== undefined) {
      tags = tags.filter(t => {
        const tagLower = t.toLowerCase()
        return !['vegetarian', 'vegan', 'gluten-free', 'keto'].includes(tagLower)
      })
      // Add new dietary tags
      pending.dietary.forEach(dietary => {
        tags.push(dietary)
      })
    }

    return tags
  }

  // Save all pending changes to database
  const savePendingChanges = async () => {
    if (pendingChanges.size === 0) return

    setUpdatingIds(new Set(Array.from(pendingChanges.keys())))

    try {
      // Save all changes in parallel
      const savePromises = Array.from(pendingChanges.entries()).map(async ([providerId, pending]) => {
        const provider = restaurants.find(p => p.id === providerId)
        if (!provider) return

        const newTags = applyPendingChangesToTags(provider, pending)
        await onUpdateProvider(providerId, newTags)
      })

      await Promise.all(savePromises)

      // Clear pending changes after successful save
      setPendingChanges(new Map())
    } catch (error) {
      console.error('[RestaurantTagging] Error saving pending changes:', error)
    } finally {
      setUpdatingIds(new Set())
    }
  }

  // Get current selections - combines saved tags with pending changes
  const getCurrentSelections = (provider: ProviderRow) => {
    const tags = provider.tags || []
    const pending = pendingChanges.get(provider.id)
    
    // Start with saved tags, but apply pending changes if they exist
    let priceRange = ''
    let cuisine = ''
    let occasions: string[] = []
    let dietary: string[] = []

    // If there's a pending change, use it; otherwise read from tags
    if (pending?.priceRange !== undefined) {
      priceRange = pending.priceRange
    } else {
      // Read from saved tags
      const priceTag = tags.find(t => {
        const tagLower = t.toLowerCase()
        return ['$', '$$', '$$$', '$$$$', 'budget', 'moderate', 'upscale', 'fine-dining'].includes(tagLower)
      })
      
      if (priceTag) {
        const tagLower = priceTag.toLowerCase()
        const directMatch = PRICE_RANGE_OPTIONS.find(o => o.tagValue === priceTag)
        if (directMatch) {
          priceRange = directMatch.id
        } else {
          if (tagLower === 'budget') priceRange = 'budget'
          else if (tagLower === 'moderate') priceRange = 'moderate'
          else if (tagLower === 'upscale') priceRange = 'upscale'
          else if (tagLower === 'fine-dining') priceRange = 'fine-dining'
        }
      }
    }

    if (pending?.cuisine !== undefined) {
      cuisine = pending.cuisine
    } else {
      cuisine = CUISINE_OPTIONS.find(c => tags.includes(c.id))?.id || ''
    }

    if (pending?.occasions !== undefined) {
      occasions = pending.occasions
    } else {
      occasions = OCCASION_OPTIONS.filter(o => tags.includes(o.id)).map(o => o.id)
    }

    if (pending?.dietary !== undefined) {
      dietary = pending.dietary
    } else {
      dietary = DIETARY_OPTIONS.filter(d => tags.includes(d.id)).map(d => d.id)
    }

    return { priceRange, cuisine, occasions, dietary }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restaurant & Cafe Tagging</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tag restaurants with price range, cuisine, occasions, and dietary options for better customer matching
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pendingChanges.size > 0 && (
            <div className="text-sm text-orange-600 font-medium">
              {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={savePendingChanges}
            disabled={pendingChanges.size === 0 || updatingIds.size > 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {updatingIds.size > 0 ? 'Saving...' : `Save ${pendingChanges.size > 0 ? `${pendingChanges.size} ` : ''}Changes`}
          </button>
          <div className="text-sm text-gray-600">
            {filteredRestaurants.length} of {restaurants.length} restaurants
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search restaurants by name, description, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Restaurants Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading restaurants...</p>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {searchTerm ? 'No restaurants match your search.' : 'No restaurants found.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Price Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cuisine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Occasions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Dietary
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRestaurants.map((restaurant) => {
                  const isUpdating = updatingIds.has(restaurant.id)
                  const hasPendingChanges = pendingChanges.has(restaurant.id)
                  const selections = getCurrentSelections(restaurant)

                  return (
                    <tr key={restaurant.id} className={`hover:bg-gray-50 ${hasPendingChanges ? 'bg-orange-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{restaurant.name}</div>
                          {hasPendingChanges && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Unsaved
                            </span>
                          )}
                        </div>
                        {restaurant.description && (
                          <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                            {restaurant.description}
                          </div>
                        )}
                        {/* Display current tags */}
                        {(restaurant.tags && restaurant.tags.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {restaurant.tags.map((tag, idx) => {
                              // Highlight restaurant classification tags
                              const isRestaurantTag = ['$', '$$', '$$$', '$$$$', 'budget', 'moderate', 'upscale', 'fine-dining', 'american', 'italian', 'mexican', 'asian', 'mediterranean', 'casual', 'date-night', 'family', 'business', 'celebration', 'quick-bite', 'vegetarian', 'vegan', 'gluten-free', 'keto'].includes(tag.toLowerCase())
                              
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                    isRestaurantTag
                                      ? 'bg-green-100 text-green-700 border border-green-200'
                                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}
                                  title={isRestaurantTag ? 'Restaurant classification tag' : 'Other tag'}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      {/* Price Range */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={selections.priceRange}
                          onChange={(e) => {
                            trackPendingChange(restaurant.id, {
                              priceRange: e.target.value || undefined
                            })
                          }}
                          disabled={isUpdating}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select...</option>
                          {PRICE_RANGE_OPTIONS.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Cuisine */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={selections.cuisine}
                          onChange={(e) => {
                            trackPendingChange(restaurant.id, {
                              cuisine: e.target.value || undefined
                            })
                          }}
                          disabled={isUpdating}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select...</option>
                          {CUISINE_OPTIONS.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Occasions (Multi-select) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {OCCASION_OPTIONS.map(option => (
                            <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selections.occasions.includes(option.id)}
                                onChange={(e) => {
                                  const currentOccasions = selections.occasions
                                  const newOccasions = e.target.checked
                                    ? [...currentOccasions, option.id]
                                    : currentOccasions.filter(o => o !== option.id)
                                  
                                  trackPendingChange(restaurant.id, {
                                    occasions: newOccasions
                                  })
                                }}
                                disabled={isUpdating}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                              />
                              <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>

                      {/* Dietary (Multi-select) */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {DIETARY_OPTIONS.map(option => (
                            <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selections.dietary.includes(option.id)}
                                onChange={(e) => {
                                  const currentDietary = selections.dietary
                                  const newDietary = e.target.checked
                                    ? [...currentDietary, option.id]
                                    : currentDietary.filter(d => d !== option.id)
                                  
                                  trackPendingChange(restaurant.id, {
                                    dietary: newDietary
                                  })
                                }}
                                disabled={isUpdating}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                              />
                              <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How it works</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Tags are automatically added to each restaurant's tag list. These tags match the customer 
                funnel questions, so restaurants will appear in search results when customers select matching 
                preferences (e.g., "Italian" cuisine, "$$" price range, "date-night" occasion).
              </p>
              <p className="mt-2">
                <strong>Tip:</strong> You can select multiple occasions and dietary options per restaurant. 
                Changes save automatically when you make selections.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

