import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fixImageUrl } from '../utils/imageUtils'

// ============================================================================
// TYPES
// ============================================================================

type CategoryKey = 'real-estate' | 'home-services' | 'health-wellness' | 'restaurants-cafes' | 'professional-services' | 'retail'

// Provider type - compatible with full Provider type from CategoryPage
type Provider = {
  id: string
  name: string
  slug: string
  category_key: CategoryKey
  rating?: number | null
  tags?: string[]
  isMember?: boolean
  images?: string[] | null
  [key: string]: any // Allow additional properties from CategoryPage Provider type
}

type ProviderDetails = {
  images?: string[]
}

interface CategoryFiltersProps {
  category: {
    key: CategoryKey
    name: string
    description: string
    icon: string
  }
  answers: Record<string, string>
  scoreProviders: (category: CategoryKey, answers: Record<string, string>) => Provider[]
  getFunnelQuestions: (categoryKey: CategoryKey, answers: Record<string, string>) => any[]
  getProviderDetails: (provider: Provider) => ProviderDetails
  isFeaturedProvider: (provider: Provider) => boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * CategoryFilters component - Category filtering UI
 * 
 * Displays interactive filtering controls and provider results with:
 * - Dynamic filter controls based on category
 * - Real-time filtering and provider scoring
 * - Provider cards with images, ratings, and tags
 * - Responsive grid layout
 * - Featured provider badges
 * - Image optimization and error handling
 * - Navigation to detailed provider pages
 * - Link to view all results
 * 
 * Used in CategoryPage to filter and display provider results
 * based on user preferences from the funnel questionnaire.
 * 
 * @param category - Category object with key, name, description, and icon
 * @param answers - User's funnel answers for initial filtering
 * @param scoreProviders - Function to score and filter providers
 * @param getFunnelQuestions - Function to get funnel questions for the category
 * @param getProviderDetails - Function to get provider details including images
 * @param isFeaturedProvider - Function to check if provider is featured
 */
export default function CategoryFilters({
  category,
  answers,
  scoreProviders,
  getFunnelQuestions,
  getProviderDetails,
  isFeaturedProvider
}: CategoryFiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>(answers)
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const auth = useAuth()

  // Get available filter options based on category
  const getFilterOptions = (questionId: string) => {
    const questions = getFunnelQuestions(category.key, {})
    const question = questions.find((q: any) => q.id === questionId)
    return question?.options || []
  }

  const updateFilter = (questionId: string, value: string) => {
    const newFilters = { ...selectedFilters, [questionId]: value }
    setSelectedFilters(newFilters)
    
    // Immediately apply filters and show results
    const scored = scoreProviders(category.key, newFilters)
    setFilteredProviders(scored)
  }

  const clearFilter = (questionId: string) => {
    const newFilters = { ...selectedFilters }
    delete newFilters[questionId]
    setSelectedFilters(newFilters)
    
    // Immediately apply filters and show results
    const scored = scoreProviders(category.key, newFilters)
    setFilteredProviders(scored)
  }

  // Apply initial filters on mount
  useEffect(() => {
    const scored = scoreProviders(category.key, selectedFilters)
    setFilteredProviders(scored)
  }, [category.key, selectedFilters, scoreProviders])

  const questions = getFunnelQuestions(category.key, {})

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-50">
          <img
            src={category.icon}
            alt={`${category.name} icon`}
            className="h-20 w-20 object-contain"
            loading="lazy"
            decoding="async"
          />
        </span>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          Refine Your {category.name} Search
        </h3>
        <p className="text-sm text-neutral-600">
          Adjust your preferences to find the perfect match
        </p>
      </div>

      {/* Compact Filter Controls - Horizontal Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {questions.map((question: any) => {
          const options = getFilterOptions(question.id)
          const currentValue = selectedFilters[question.id]
          
          return (
            <div key={question.id} className="space-y-1">
              <label className="text-xs font-medium text-neutral-600 block">
                {question.prompt}
              </label>
              <select
                value={currentValue || ''}
                onChange={(e) => {
                  if (e.target.value === '') {
                    clearFilter(question.id)
                  } else {
                    updateFilter(question.id, e.target.value)
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">All</option>
                {options.map((option: { id: string; label: string }) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      {/* Results - Always Visible */}
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="text-xl font-semibold text-neutral-900">
            Your Matches ({filteredProviders.length})
          </h4>
        </div>
        
        {filteredProviders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProviders.slice(0, 8).map((provider) => {
                const details = getProviderDetails(provider)
                // Check if we have a valid image URL after processing
                const imageUrl = details.images && details.images.length > 0 ? fixImageUrl(details.images[0]) : ''
                
                return (
                  <Link key={provider.id} to={`/provider/${provider.slug}`} className="block">
                    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      {/* Provider Image with Overlays */}
                      <div className="relative">
                        {imageUrl ? (
                          <div className="aspect-video bg-neutral-100">
                            <img
                              src={imageUrl}
                              alt={`${provider.name} business photo`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement
                                img.style.display = 'none'
                                img.parentElement!.innerHTML = `
                                  <div class="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-dashed border-blue-200">
                                    <div class="text-center text-blue-600 px-4">
                                      <svg class="w-12 h-12 mx-auto mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <p class="text-xs font-medium">${provider.name}</p>
                                      <p class="text-[10px] mt-1 opacity-70">Photo coming soon</p>
                                    </div>
                                  </div>
                                `
                              }}
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-dashed border-blue-200">
                            <div className="text-center text-blue-600 px-4">
                              <svg className="w-12 h-12 mx-auto mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <p className="text-xs font-medium">{provider.name}</p>
                              <p className="text-[10px] mt-1 opacity-70">Photo coming soon</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Featured Badge - Top Right Over Image */}
                        {isFeaturedProvider(provider) && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium shadow-sm">
                              ⭐ Featured
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Category Tag - Positioned between image and title, half on image */}
                      <div className="relative -mt-3 mb-3">
                        <div className="flex justify-start ml-2">
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium border border-blue-200 shadow-sm">
                            {provider.category_key.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Provider Info */}
                      <div className="p-2 text-center mt-[-1rem]">
                        <div className="flex flex-col items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-neutral-900 text-lg">{provider.name}</h3>
                        </div>
                        
                        {/* Rating Display */}
                        {provider.rating && (
                          <div className="flex items-center justify-center gap-1 mb-3">
                            <span className="text-sm font-medium text-neutral-900">{provider.rating.toFixed(1)}</span>
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Tags - Only visible to admin, but hidden for restaurants-cafes */}
                        {auth.isAuthed && provider.tags && provider.tags.length > 0 && provider.category_key !== 'restaurants-cafes' && (
                          <div className="flex flex-wrap gap-1 justify-center mb-3">
                            {provider.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {filteredProviders.length > 8 && (
              <div className="text-center mt-6">
                <Link
                  to={`/book?category=${category.key}&filters=${encodeURIComponent(JSON.stringify(selectedFilters))}`}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  View All {filteredProviders.length} Results
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p>No matches found with your current filters.</p>
            <p className="text-sm mt-1">Try adjusting your preferences or clearing some filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Export types for use in other components
export type { CategoryKey, Provider, ProviderDetails, CategoryFiltersProps }
