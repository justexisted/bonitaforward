/**
 * CATEGORY TAGGING SECTION
 * 
 * Allows admins to quickly tag businesses in any category with category-specific fields.
 * Fields are dynamically loaded from funnelQuestions.ts to match the customer funnel.
 * 
 * Category-specific fields:
 * - Restaurants & Cafés: Occasion, Cuisine, Price Range, Dietary
 * - Home Services: Service Type, Timeline, Budget, Property Type
 * - Real Estate: Need, Timeline, Budget, Bedrooms
 * - Health & Wellness: Service Type, Frequency, Experience, Location
 * - Professional Services: Service, Urgency, Business Size, Budget
 * 
 * Tags are automatically added to the provider's tags array and match
 * the funnel question IDs for accurate matching in the booking flow.
 */

import { useState, useMemo } from 'react'
import type { ProviderRow } from '../../../types/admin'
import { CATEGORY_OPTIONS } from '../../../constants/categories'
import type { CategoryKey } from '../../../types'
import { funnelConfig } from '../../../utils/funnelQuestions'

interface RestaurantTaggingSectionProps {
  providers: ProviderRow[]
  onUpdateProvider: (providerId: string, tags: string[]) => Promise<void>
  loading?: boolean
}

// Price range tag mapping (for restaurants-cafes)
const PRICE_RANGE_TAG_MAP: Record<string, string> = {
  'budget': '$',
  'moderate': '$$',
  'upscale': '$$$',
  'fine-dining': '$$$$'
}

export function RestaurantTaggingSection({
  providers,
  onUpdateProvider,
  loading = false
}: RestaurantTaggingSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('restaurants-cafes')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  
  // Get funnel questions for the selected category
  const categoryQuestions = useMemo(() => {
    return funnelConfig[selectedCategory] || []
  }, [selectedCategory])

  // Track pending changes (unsaved selections) - dynamic based on category
  const [pendingChanges, setPendingChanges] = useState<Map<string, Record<string, string | string[]>>>(new Map())

  // Get category display name
  const selectedCategoryName = useMemo(() => {
    return CATEGORY_OPTIONS.find(c => c.key === selectedCategory)?.name || selectedCategory
  }, [selectedCategory])

  // Filter to selected category only
  const businesses = useMemo(() => {
    return providers.filter(p => p.category_key === selectedCategory)
  }, [providers, selectedCategory])

  // Filter by search term
  const filteredBusinesses = useMemo(() => {
    if (!searchTerm.trim()) return businesses
    const term = searchTerm.toLowerCase()
    return businesses.filter(b => 
      b.name.toLowerCase().includes(term) ||
      b.description?.toLowerCase().includes(term) ||
      b.tags?.some(tag => tag.toLowerCase().includes(term))
    )
  }, [businesses, searchTerm])

  // Track pending changes locally (doesn't save to database yet)
  const trackPendingChange = (
    providerId: string,
    fieldId: string,
    value: string | string[]
  ) => {
    setPendingChanges(prev => {
      const next = new Map(prev)
      const existing = next.get(providerId) || {}
      
      // Merge new update with existing pending changes
      const merged = {
        ...existing,
        [fieldId]: value
      }
      
      // Remove empty changes
      const hasChanges = Object.keys(merged).some(key => {
        const val = merged[key]
        return val !== undefined && 
               val !== '' && 
               (Array.isArray(val) ? val.length > 0 : true)
      })
      
      if (hasChanges) {
        next.set(providerId, merged)
      } else {
        next.delete(providerId)
      }
      
      return next
    })
  }

  // Get all possible tag values for a question (for filtering old tags)
  // Returns both option IDs and any mapped tag values (e.g., 'budget' and '$' for price-range)
  const getQuestionTagValues = (questionId: string): string[] => {
    const question = categoryQuestions.find(q => q.id === questionId)
    if (!question) return []
    
    const values: string[] = []
    question.options.forEach(opt => {
      // Always include the option ID
      values.push(opt.id)
      
      // Special handling for price-range: also include the mapped tag value
      if (questionId === 'price-range' && PRICE_RANGE_TAG_MAP[opt.id]) {
        values.push(PRICE_RANGE_TAG_MAP[opt.id])
      }
    })
    
    return values
  }

  // Apply pending changes to tags and save to database
  const applyPendingChangesToTags = (
    provider: ProviderRow,
    pending: Record<string, string | string[]>
  ): string[] => {
    let tags = [...(provider.tags || [])]

    // Process each field in pending changes
    Object.entries(pending).forEach(([fieldId, value]) => {
      // Get all possible tag values for this field to remove old ones
      const fieldTagValues = getQuestionTagValues(fieldId)
      
      // Remove old tags for this field
      tags = tags.filter(t => {
        const tagLower = t.toLowerCase()
        return !fieldTagValues.some(fieldTag => {
          const fieldTagLower = fieldTag.toLowerCase()
          return tagLower === fieldTagLower || tagLower.includes(fieldTagLower) || fieldTagLower.includes(tagLower)
        })
      })
      
      // Add new tag(s)
      if (Array.isArray(value)) {
        // Multi-select field (e.g., occasions, dietary)
        value.forEach(v => {
          if (v) tags.push(v)
        })
      } else if (value) {
        // Single-select field
        // Special handling for price-range
        if (fieldId === 'price-range' && PRICE_RANGE_TAG_MAP[value]) {
          tags.push(PRICE_RANGE_TAG_MAP[value])
        } else {
          tags.push(value)
        }
      }
    })

    return tags
  }

  // Save all pending changes to database
  const savePendingChanges = async () => {
    if (pendingChanges.size === 0) return

    setUpdatingIds(new Set(Array.from(pendingChanges.keys())))

    try {
      // Save all changes in parallel
      const savePromises = Array.from(pendingChanges.entries()).map(async ([providerId, pending]) => {
        const provider = businesses.find(p => p.id === providerId)
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

  // Determine if a field is multi-select based on field ID and category
  const isMultiSelectField = (fieldId: string): boolean => {
    // Fields that are always multi-select
    const multiSelectFields: Record<CategoryKey, string[]> = {
      'restaurants-cafes': ['occasion', 'dietary'],
      'home-services': ['type'], // Service type can have multiple
      'health-wellness': ['type'], // Service type can have multiple
      'professional-services': ['service'], // Service can have multiple
      'real-estate': [], // All single-select
      'retail': [] // All single-select (can be updated when retail funnel questions are defined)
    }
    
    return multiSelectFields[selectedCategory]?.includes(fieldId) || false
  }

  // Get field display label
  const getFieldLabel = (fieldId: string): string => {
    const labelMap: Record<string, string> = {
      'occasion': 'Occasions',
      'cuisine': 'Cuisine',
      'price-range': 'Price Range',
      'dietary': 'Dietary',
      'type': 'Service Type',
      'timeline': 'Timeline',
      'budget': 'Budget',
      'property-type': 'Property Type',
      'need': 'Need',
      'beds': 'Bedrooms',
      'frequency': 'Frequency',
      'experience': 'Experience',
      'location': 'Location',
      'service': 'Service',
      'urgency': 'Urgency',
      'business-size': 'Business Size'
    }
    
    return labelMap[fieldId] || fieldId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Auto-tag business based on keywords in name, description, and existing tags
  const autoTagBusiness = (provider: ProviderRow): Record<string, string | string[]> => {
    const textToSearch = [
      provider.name || '',
      provider.description || '',
      ...(provider.tags || [])
    ].join(' ').toLowerCase()

    const suggestions: Record<string, string | string[]> = {}

    // For each question in the category, try to match keywords
    categoryQuestions.forEach(question => {
      const fieldId = question.id
      const isMulti = isMultiSelectField(fieldId)
      const matches: string[] = []

      question.options.forEach(option => {
        const optionId = option.id.toLowerCase()
        const optionLabel = option.label.toLowerCase()
        
        // Check if option ID or label appears in the text
        if (textToSearch.includes(optionId) || textToSearch.includes(optionLabel)) {
          matches.push(option.id)
        } else {
          // Check for partial matches and common variations
          const optionWords = optionLabel.split(/\s+/)
          const hasMatch = optionWords.some(word => {
            if (word.length < 3) return false // Skip very short words
            return textToSearch.includes(word)
          })
          
          if (hasMatch) {
            matches.push(option.id)
          }
        }

        // Category-specific keyword matching
        if (selectedCategory === 'restaurants-cafes') {
          // Cuisine matching with common keywords
          if (fieldId === 'cuisine') {
            const cuisineKeywords: Record<string, string[]> = {
              'mexican': ['taco', 'burrito', 'mexican', 'tex-mex', 'texmex', 'enchilada', 'quesadilla'],
              'italian': ['pizza', 'pasta', 'italian', 'trattoria', 'ristorante', 'risotto', 'gelato'],
              'asian': ['sushi', 'ramen', 'pho', 'chinese', 'japanese', 'thai', 'korean', 'indian', 'asian'],
              'american': ['burger', 'bbq', 'barbecue', 'steak', 'steakhouse', 'american'],
              'mediterranean': ['greek', 'falafel', 'hummus', 'gyro', 'mediterranean', 'middle eastern']
            }
            if (cuisineKeywords[optionId]?.some(keyword => textToSearch.includes(keyword))) {
              matches.push(option.id)
            }
          }

          // Price range matching
          if (fieldId === 'price-range') {
            const priceKeywords: Record<string, string[]> = {
              'budget': ['budget', 'cheap', 'affordable', 'inexpensive', 'economical'],
              'moderate': ['moderate', 'mid-range', 'reasonable', 'average'],
              'upscale': ['upscale', 'premium', 'high-end', 'fine', 'elegant'],
              'fine-dining': ['fine dining', 'gourmet', 'luxury', 'exclusive', 'upscale restaurant']
            }
            if (priceKeywords[optionId]?.some(keyword => textToSearch.includes(keyword))) {
              matches.push(option.id)
            }
          }

          // Dietary matching
          if (fieldId === 'dietary') {
            const dietaryKeywords: Record<string, string[]> = {
              'vegetarian': ['vegetarian', 'veggie', 'plant-based'],
              'vegan': ['vegan', 'plant-based', 'no animal'],
              'gluten-free': ['gluten-free', 'gluten free', 'gf', 'celiac'],
              'keto': ['keto', 'ketogenic', 'low-carb']
            }
            if (dietaryKeywords[optionId]?.some(keyword => textToSearch.includes(keyword))) {
              matches.push(option.id)
            }
          }
        }

        if (selectedCategory === 'home-services') {
          // Service type matching
          if (fieldId === 'type') {
            const serviceKeywords: Record<string, string[]> = {
              'landscaping': ['landscaping', 'landscape', 'garden', 'gardening', 'lawn', 'yard', 'irrigation'],
              'solar': ['solar', 'photovoltaic', 'pv', 'renewable energy'],
              'cleaning': ['cleaning', 'clean', 'maid', 'janitorial', 'housekeeping'],
              'remodeling': ['remodeling', 'renovation', 'remodel', 'renovate', 'construction', 'contractor'],
              'plumbing': ['plumbing', 'plumber', 'pipe', 'drain', 'water heater', 'faucet'],
              'electrical': ['electrical', 'electrician', 'wiring', 'outlet', 'lighting', 'electrical work'],
              'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'furnace', 'thermostat']
            }
            if (serviceKeywords[optionId]?.some(keyword => textToSearch.includes(keyword))) {
              matches.push(option.id)
            }
          }
        }

        if (selectedCategory === 'professional-services') {
          // Service matching
          if (fieldId === 'service') {
            const serviceKeywords: Record<string, string[]> = {
              'legal': ['legal', 'law', 'attorney', 'lawyer', 'litigation', 'legal services'],
              'accounting': ['accounting', 'accountant', 'bookkeeping', 'tax', 'cpa', 'financial'],
              'consulting': ['consulting', 'consultant', 'advisory', 'strategy'],
              'marketing': ['marketing', 'advertising', 'promotion', 'branding', 'seo', 'social media'],
              'insurance': ['insurance', 'insurer', 'coverage', 'policy'],
              'financial': ['financial planning', 'financial advisor', 'investment', 'wealth management']
            }
            if (serviceKeywords[optionId]?.some(keyword => textToSearch.includes(keyword))) {
              matches.push(option.id)
            }
          }
        }

        if (selectedCategory === 'health-wellness') {
          // Service type matching
          if (fieldId === 'type') {
            const serviceKeywords: Record<string, string[]> = {
              'dental': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist'],
              'chiropractor': ['chiropractor', 'chiro', 'spinal', 'adjustment'],
              'gym': ['gym', 'fitness', 'workout', 'training', 'exercise'],
              'salon': ['salon', 'hair', 'beauty', 'haircut', 'styling', 'barber'],
              'spa': ['spa', 'massage', 'facial', 'skincare', 'wellness'],
              'medical': ['medical', 'doctor', 'physician', 'clinic', 'healthcare'],
              'therapy': ['therapy', 'therapist', 'physical therapy', 'counseling']
            }
            if (serviceKeywords[optionId]?.some(keyword => textToSearch.includes(keyword))) {
              matches.push(option.id)
            }
          }
        }
      })

      if (matches.length > 0) {
        if (isMulti) {
          suggestions[fieldId] = matches
        } else {
          // For single-select, take the first match
          suggestions[fieldId] = matches[0]
        }
      }
    })

    return suggestions
  }

  // Auto-tag all businesses in the current category
  const autoTagAllBusinesses = () => {
    const newPendingChanges = new Map(pendingChanges)
    
    filteredBusinesses.forEach(business => {
      const suggestions = autoTagBusiness(business)
      const currentSelections = getCurrentSelections(business)
      
      // Only add suggestions for fields that don't already have values
      Object.entries(suggestions).forEach(([fieldId, value]) => {
        const currentValue = currentSelections[fieldId]
        const isEmpty = !currentValue || 
          (typeof currentValue === 'string' && currentValue === '') ||
          (Array.isArray(currentValue) && currentValue.length === 0)
        
        if (isEmpty) {
          const existing = newPendingChanges.get(business.id) || {}
          newPendingChanges.set(business.id, {
            ...existing,
            [fieldId]: value
          })
        }
      })
    })

    setPendingChanges(newPendingChanges)
  }

  // Auto-tag a single business
  const autoTagSingleBusiness = (business: ProviderRow) => {
    const suggestions = autoTagBusiness(business)
    const currentSelections = getCurrentSelections(business)
    
    // Only add suggestions for fields that don't already have values
    const updates: Record<string, string | string[]> = {}
    Object.entries(suggestions).forEach(([fieldId, value]) => {
      const currentValue = currentSelections[fieldId]
      const isEmpty = !currentValue || 
        (typeof currentValue === 'string' && currentValue === '') ||
        (Array.isArray(currentValue) && currentValue.length === 0)
      
      if (isEmpty) {
        updates[fieldId] = value
      }
    })

    if (Object.keys(updates).length > 0) {
      Object.entries(updates).forEach(([fieldId, value]) => {
        trackPendingChange(business.id, fieldId, value)
      })
    }
  }

  // Get current selections - combines saved tags with pending changes
  const getCurrentSelections = (provider: ProviderRow): Record<string, string | string[]> => {
    const tags = provider.tags || []
    const pending = pendingChanges.get(provider.id)
    const selections: Record<string, string | string[]> = {}

    // For each question in the category, get the current selection
    categoryQuestions.forEach(question => {
      const fieldId = question.id
      
      // If there's a pending change, use it; otherwise read from tags
      if (pending && pending[fieldId] !== undefined) {
        selections[fieldId] = pending[fieldId]
      } else {
        // Read from saved tags
        if (fieldId === 'price-range') {
          // Special handling for price range (maps $, $$, etc. back to budget, moderate, etc.)
          const priceTag = tags.find(t => {
            const tagLower = t.toLowerCase()
            return ['$', '$$', '$$$', '$$$$', 'budget', 'moderate', 'upscale', 'fine-dining'].includes(tagLower)
          })
          
          if (priceTag) {
            const tagLower = priceTag.toLowerCase()
            // Map tag values back to option IDs
            if (tagLower === '$' || tagLower === 'budget') selections[fieldId] = 'budget'
            else if (tagLower === '$$' || tagLower === 'moderate') selections[fieldId] = 'moderate'
            else if (tagLower === '$$$' || tagLower === 'upscale') selections[fieldId] = 'upscale'
            else if (tagLower === '$$$$' || tagLower === 'fine-dining') selections[fieldId] = 'fine-dining'
            else selections[fieldId] = ''
          } else {
            selections[fieldId] = ''
          }
        } else {
          // Find matching options from tags
          const matchingOptions = question.options.filter(opt => {
            const optId = opt.id.toLowerCase()
            return tags.some(tag => {
              const tagLower = tag.toLowerCase()
              return tagLower === optId || tagLower.includes(optId) || optId.includes(tagLower)
            })
          })
          
          if (isMultiSelectField(fieldId)) {
            // Multi-select field
            selections[fieldId] = matchingOptions.map(opt => opt.id)
          } else {
            // Single-select field
            selections[fieldId] = matchingOptions[0]?.id || ''
          }
        }
      }
    })

    return selections
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Category Tagging</h2>
          <p className="text-sm text-gray-600 mt-1">
            Tag businesses with category-specific fields for better customer matching. Use "Auto-Tag All" to automatically assign tags based on keywords in business names, descriptions, and existing tags.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {pendingChanges.size > 0 && (
            <div className="text-sm text-orange-600 font-medium">
              {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={autoTagAllBusinesses}
            disabled={updatingIds.size > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            title="Automatically tag all businesses based on keywords in their name, description, and existing tags"
          >
            Auto-Tag All
          </button>
          <button
            onClick={savePendingChanges}
            disabled={pendingChanges.size === 0 || updatingIds.size > 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {updatingIds.size > 0 ? 'Saving...' : `Save ${pendingChanges.size > 0 ? `${pendingChanges.size} ` : ''}Changes`}
          </button>
          <div className="text-sm text-gray-600">
            {filteredBusinesses.length} of {businesses.length} businesses
          </div>
        </div>
      </div>

      {/* Category Selector */}
      <div>
        <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Category
        </label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value as CategoryKey)
            setSearchTerm('') // Clear search when changing category
            setPendingChanges(new Map()) // Clear pending changes when changing category
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          {CATEGORY_OPTIONS.map(category => (
            <option key={category.key} value={category.key}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder={`Search ${selectedCategoryName.toLowerCase()} by name, description, or tags...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Businesses Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading businesses...</p>
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {searchTerm ? `No ${selectedCategoryName.toLowerCase()} match your search.` : `No ${selectedCategoryName.toLowerCase()} found in this category.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Business
                  </th>
                  {categoryQuestions.map(question => (
                    <th key={question.id} className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {getFieldLabel(question.id)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBusinesses.map((business) => {
                  const isUpdating = updatingIds.has(business.id)
                  const hasPendingChanges = pendingChanges.has(business.id)
                  const selections = getCurrentSelections(business)

                  return (
                    <tr key={business.id} className={`hover:bg-gray-50 ${hasPendingChanges ? 'bg-orange-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{business.name}</div>
                          {hasPendingChanges && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              Unsaved
                            </span>
                          )}
                          <button
                            onClick={() => autoTagSingleBusiness(business)}
                            disabled={isUpdating}
                            className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                            title="Auto-tag this business based on keywords"
                          >
                            Auto-Tag
                          </button>
                        </div>
                        {business.description && (
                          <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                            {business.description}
                          </div>
                        )}
                        {/* Display current tags */}
                        {(business.tags && business.tags.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {business.tags.map((tag, idx) => {
                              // Get all possible tag values for this category to highlight classification tags
                              const allCategoryTagValues = categoryQuestions.flatMap(q => 
                                getQuestionTagValues(q.id)
                              )
                              const isClassificationTag = allCategoryTagValues.some(categoryTag => {
                                const tagLower = tag.toLowerCase()
                                const categoryTagLower = categoryTag.toLowerCase()
                                return tagLower === categoryTagLower || 
                                       tagLower.includes(categoryTagLower) || 
                                       categoryTagLower.includes(tagLower)
                              })
                              
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                    isClassificationTag
                                      ? 'bg-green-100 text-green-700 border border-green-200'
                                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}
                                  title={isClassificationTag ? 'Classification tag' : 'Other tag'}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      {/* Dynamic fields based on category */}
                      {categoryQuestions.map(question => {
                        const fieldId = question.id
                        const isMulti = isMultiSelectField(fieldId)
                        const currentValue = selections[fieldId]
                        const currentArray = Array.isArray(currentValue) ? currentValue : []
                        const currentString = typeof currentValue === 'string' ? currentValue : ''

                        return (
                          <td key={fieldId} className={`px-6 py-4 ${isMulti ? '' : 'whitespace-nowrap'}`}>
                            {isMulti ? (
                              // Multi-select (checkboxes)
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {question.options.map(option => {
                                  const isChecked = currentArray.includes(option.id)
                                  return (
                                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const newArray = e.target.checked
                                            ? [...currentArray, option.id]
                                            : currentArray.filter(id => id !== option.id)
                                          trackPendingChange(business.id, fieldId, newArray)
                                        }}
                                        disabled={isUpdating}
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50"
                                      />
                                      <span className="text-sm text-gray-700">{option.label}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            ) : (
                              // Single-select (dropdown)
                              <select
                                value={currentString}
                                onChange={(e) => {
                                  trackPendingChange(business.id, fieldId, e.target.value || '')
                                }}
                                disabled={isUpdating}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Select...</option>
                                {question.options.map(option => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        )
                      })}
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
                Tags are automatically added to each business's tag list. These tags match the customer 
                funnel questions, so businesses will appear in search results when customers select matching 
                preferences. Each category has its own set of relevant fields.
              </p>
              <p className="mt-2">
                <strong>Tip:</strong> Fields marked with checkboxes allow multiple selections (e.g., service types, occasions). 
                Dropdown fields allow single selection. Select a category above to manage tags for businesses in that category. 
                Changes are saved when you click "Save Changes".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

