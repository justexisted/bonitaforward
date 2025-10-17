/**
 * PROVIDER SCORING UTILITIES
 * 
 * Complex scoring algorithms for different business categories.
 * This file contains category-specific scoring logic that matches
 * providers to user preferences based on funnel answers.
 * 
 * Categories with custom scoring:
 * - Health & Wellness (comprehensive synonym matching for medical/fitness/salon)
 * - Real Estate (property type, buying/selling, staging)
 * - Restaurants & Cafes (cuisine types, occasion, price, service)
 * - Home Services (service types, urgency, budget)
 * - Professional Services (generic tag matching)
 * 
 * Scoring Features:
 * - Synonym mapping for better matching
 * - Featured provider prioritization (only when matching criteria)
 * - Multi-criteria weighting
 * - Rating-based secondary sorting
 * - Alphabetical tertiary sorting
 */

import { type CategoryKey, type Provider, isFeaturedProvider } from './helpers'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Scored provider with score value
 */
interface ScoredProvider {
  p: Provider
  score: number
}

// ============================================================================
// SYNONYM MAPPINGS
// ============================================================================

/**
 * Get synonyms for health-wellness provider types
 * Comprehensive mapping for medical, fitness, salon, and wellness services
 */
function getHealthWellnessSynonyms(providerType: string): string[] {
  const synonymMap: Record<string, string[]> = {
    // Dental
    'dental': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist', 'periodontist', 'endodontist', 'oral surgery', 'dental care', 'dental center', 'dental group', 'dental office', 'dds', 'dmd'],
    'dentist': ['dental', 'dentist', 'dentistry', 'oral', 'orthodontist', 'periodontist', 'endodontist', 'oral surgery', 'dental care', 'dental center', 'dental group', 'dental office', 'dds', 'dmd'],
    
    // Gym/Fitness
    'gym': ['gym', 'fitness', '24 hour', '24-hour', '24hr', 'fitness center', 'workout', 'training', 'personal training', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'swimming', 'tennis'],
    'fitness': ['gym', 'fitness', '24 hour', '24-hour', '24hr', 'fitness center', 'workout', 'training', 'personal training', 'crossfit', 'yoga', 'pilates', 'martial arts', 'boxing', 'swimming', 'tennis'],
    
    // Salon/Beauty
    'salon': ['salon', 'hair', 'beauty', 'hair salon', 'beauty salon', 'haircut', 'styling', 'color', 'highlights', 'perm', 'extensions', 'barber', 'barbershop', 'nail', 'nail salon', 'manicure', 'pedicure'],
    'beauty': ['salon', 'hair', 'beauty', 'hair salon', 'beauty salon', 'haircut', 'styling', 'color', 'highlights', 'perm', 'extensions', 'barber', 'barbershop', 'nail', 'nail salon', 'manicure', 'pedicure'],
    
    // Spa/Med Spa
    'spa': ['spa', 'medspa', 'medical spa', 'massage', 'facial', 'skincare', 'aesthetic', 'cosmetic', 'botox', 'fillers', 'laser', 'rejuvenation', 'wellness spa', 'day spa'],
    'medspa': ['spa', 'medspa', 'medical spa', 'massage', 'facial', 'skincare', 'aesthetic', 'cosmetic', 'botox', 'fillers', 'laser', 'rejuvenation', 'wellness spa', 'day spa'],
    
    // Chiropractor
    'chiro': ['chiropractor', 'chiro', 'spinal', 'adjustment', 'back pain', 'neck pain', 'wellness'],
    'chiropractor': ['chiropractor', 'chiro', 'spinal', 'adjustment', 'back pain', 'neck pain', 'wellness'],
    
    // Medical
    'medical': ['medical', 'doctor', 'physician', 'clinic', 'healthcare', 'primary care', 'family medicine', 'internal medicine', 'pediatrics', 'urgent care'],
    
    // Therapy
    'therapy': ['therapy', 'therapist', 'physical therapy', 'pt', 'occupational therapy', 'ot', 'speech therapy', 'rehabilitation', 'rehab', 'counseling', 'mental health', 'psychology', 'psychiatry'],
    
    // Naturopathic
    'naturopathic': ['naturopath', 'naturopathic', 'nd', 'natural medicine', 'holistic', 'alternative medicine', 'functional medicine', 'integrative medicine'],
    
    // Vision/Eye Care
    'vision': ['optometry', 'optometrist', 'vision', 'eye care', 'eyewear', 'glasses', 'contacts', 'ophthalmology', 'ophthalmologist'],
    
    // Mental Health
    'mental': ['mental health', 'psychology', 'psychiatrist', 'psychologist', 'counseling', 'therapist', 'therapy', 'depression', 'anxiety', 'counselor'],
    
    // Physical Therapy
    'physical': ['physical therapy', 'pt', 'physiotherapy', 'rehabilitation', 'rehab', 'sports medicine', 'injury recovery'],
    
    // Podiatry
    'podiatry': ['podiatrist', 'foot care', 'foot doctor', 'ankle', 'foot surgery'],
    
    // Dermatology
    'dermatology': ['dermatologist', 'skin care', 'dermatology', 'skin doctor', 'acne', 'moles', 'skin cancer'],
    
    // Acupuncture
    'acupuncture': ['acupuncture', 'acupuncturist', 'traditional chinese medicine', 'tcm'],
  }
  
  return synonymMap[providerType.toLowerCase()] || [providerType]
}

/**
 * Get synonyms for restaurant/cafe cuisine types
 */
function getCuisineSynonyms(cuisineType: string): string[] {
  const synonyms: Record<string, string[]> = {
    'mexican': ['mexican', 'mexican restaurant', 'tacos', 'taco', 'burrito', 'burritos', 'mexican food', 'tex-mex', 'texmex'],
    'asian': ['asian', 'asian restaurant', 'chinese', 'japanese', 'thai', 'vietnamese', 'korean', 'indian', 'asian food', 'sushi', 'ramen', 'pho'],
    'american': ['american', 'american restaurant', 'burger', 'burgers', 'bbq', 'barbecue', 'steak', 'steakhouse', 'american food'],
    'cafes': ['cafes', 'cafe', 'coffee', 'coffee shop', 'coffeeshop', 'coffeehouse', 'espresso', 'latte', 'cappuccino', 'breakfast', 'brunch'],
    'italian': ['italian', 'italian restaurant', 'pizza', 'pasta', 'italian food', 'trattoria', 'ristorante'],
    'mediterranean': ['mediterranean', 'greek', 'middle eastern', 'mediterranean food', 'falafel', 'hummus', 'gyro'],
    'seafood': ['seafood', 'fish', 'lobster', 'crab', 'shrimp', 'oyster', 'seafood restaurant'],
    'vegetarian': ['vegetarian', 'vegan', 'plant-based', 'vegetarian restaurant', 'vegan restaurant'],
    'fast food': ['fast food', 'quick service', 'drive-thru', 'fast casual'],
    'fine dining': ['fine dining', 'upscale', 'gourmet', 'fine restaurant', 'elegant dining']
  }
  return synonyms[cuisineType] || [cuisineType]
}

/**
 * Get synonyms for home services types
 * Comprehensive mapping for all home service categories
 */
function getHomeServicesSynonyms(serviceType: string): string[] {
  const synonymMap: Record<string, string[]> = {
    // Landscaping
    'landscaping': ['landscaping', 'landscape', 'landscape design', 'garden', 'gardening', 'lawn care', 'lawn', 'yard', 'outdoor', 'plants', 'trees', 'shrubs', 'irrigation', 'sprinkler', 'maintenance', 'tree service', 'tree trimming', 'tree removal'],
    'landscape': ['landscaping', 'landscape', 'landscape design', 'garden', 'gardening', 'lawn care', 'lawn', 'yard', 'outdoor', 'plants', 'trees', 'shrubs', 'irrigation', 'sprinkler', 'maintenance', 'tree service', 'tree trimming', 'tree removal'],
    
    // Cleaning Services
    'cleaning': ['cleaning', 'house cleaning', 'residential cleaning', 'commercial cleaning', 'deep clean', 'maid service', 'janitorial', 'carpet cleaning', 'upholstery cleaning', 'window cleaning', 'move-in cleaning', 'move-out cleaning', 'post construction cleaning'],
    'house cleaning': ['cleaning', 'house cleaning', 'residential cleaning', 'commercial cleaning', 'deep clean', 'maid service', 'janitorial', 'carpet cleaning', 'upholstery cleaning', 'window cleaning', 'move-in cleaning', 'move-out cleaning', 'post construction cleaning'],
    
    // Solar/Energy
    'solar': ['solar', 'solar panels', 'solar installation', 'solar energy', 'renewable energy', 'photovoltaic', 'pv', 'solar system', 'solar power', 'green energy', 'clean energy', 'solar contractor', 'solar company'],
    'solar installation': ['solar', 'solar panels', 'solar installation', 'solar energy', 'renewable energy', 'photovoltaic', 'pv', 'solar system', 'solar power', 'green energy', 'clean energy', 'solar contractor', 'solar company'],
    
    // Remodeling/Construction
    'remodeling': ['remodeling', 'renovation', 'home improvement', 'construction', 'general contractor', 'gc', 'kitchen remodel', 'bathroom remodel', 'addition', 'home addition', 'basement finishing', 'room addition', 'custom home'],
    'renovation': ['remodeling', 'renovation', 'home improvement', 'construction', 'general contractor', 'gc', 'kitchen remodel', 'bathroom remodel', 'addition', 'home addition', 'basement finishing', 'room addition', 'custom home'],
    
    // Plumbing
    'plumbing': ['plumbing', 'plumber', 'pipe', 'pipes', 'drain', 'drain cleaning', 'water heater', 'toilet', 'faucet', 'leak repair', 'pipe repair', 'sewer', 'septic', 'bathroom plumbing', 'kitchen plumbing'],
    'plumber': ['plumbing', 'plumber', 'pipe', 'pipes', 'drain', 'drain cleaning', 'water heater', 'toilet', 'faucet', 'leak repair', 'pipe repair', 'sewer', 'septic', 'bathroom plumbing', 'kitchen plumbing'],
    
    // Electrical
    'electrical': ['electrical', 'electrician', 'electrical work', 'electrical installation', 'electrical repair', 'outlet', 'outlets', 'switch', 'switches', 'lighting', 'electrical panel', 'circuit breaker', 'wiring', 'electrical contractor'],
    'electrician': ['electrical', 'electrician', 'electrical work', 'electrical installation', 'electrical repair', 'outlet', 'outlets', 'switch', 'switches', 'lighting', 'electrical panel', 'circuit breaker', 'wiring', 'electrical contractor'],
    
    // HVAC
    'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
    'heating': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
    'cooling': ['hvac', 'heating', 'cooling', 'air conditioning', 'ac', 'heating and cooling', 'furnace', 'air conditioner', 'heat pump', 'ductwork', 'duct cleaning', 'thermostat', 'hvac contractor', 'hvac technician'],
    
    // Roofing
    'roofing': ['roofing', 'roofer', 'roof', 'roof repair', 'roof replacement', 'roofing contractor', 'shingles', 'tile', 'metal roofing', 'flat roof', 'roofing company'],
    'roofer': ['roofing', 'roofer', 'roof', 'roof repair', 'roof replacement', 'roofing contractor', 'shingles', 'tile', 'metal roofing', 'flat roof', 'roofing company'],
    
    // Flooring
    'flooring': ['flooring', 'floor', 'floors', 'hardwood', 'carpet', 'tile', 'laminate', 'vinyl', 'flooring installation', 'flooring contractor', 'floor refinishing', 'floor sanding'],
    'floor': ['flooring', 'floor', 'floors', 'hardwood', 'carpet', 'tile', 'laminate', 'vinyl', 'flooring installation', 'flooring contractor', 'floor refinishing', 'floor sanding'],
    
    // Painting
    'painting': ['painting', 'painter', 'paint', 'interior painting', 'exterior painting', 'house painting', 'paint contractor', 'color consultation', 'paint job', 'painting company'],
    'painter': ['painting', 'painter', 'paint', 'interior painting', 'exterior painting', 'house painting', 'paint contractor', 'color consultation', 'paint job', 'painting company'],
    
    // Handyman
    'handyman': ['handyman', 'handy man', 'general repair', 'home repair', 'maintenance', 'fix', 'repair', 'small jobs', 'odd jobs', 'home maintenance', 'handyman services'],
    'handy man': ['handyman', 'handy man', 'general repair', 'home repair', 'maintenance', 'fix', 'repair', 'small jobs', 'odd jobs', 'home maintenance', 'handyman services'],
    
    // Pool Services
    'pool': ['pool', 'pool service', 'pool maintenance', 'pool cleaning', 'pool repair', 'pool contractor', 'swimming pool', 'pool equipment', 'pool installation'],
    'pool service': ['pool', 'pool service', 'pool maintenance', 'pool cleaning', 'pool repair', 'pool contractor', 'swimming pool', 'pool equipment', 'pool installation'],
    
    // Pest Control
    'pest control': ['pest control', 'pest management', 'exterminator', 'extermination', 'termite', 'rodent', 'ant', 'spider', 'pest removal', 'pest prevention'],
    'exterminator': ['pest control', 'pest management', 'exterminator', 'extermination', 'termite', 'rodent', 'ant', 'spider', 'pest removal', 'pest prevention'],
    
    // Security
    'security': ['security', 'security system', 'alarm', 'alarm system', 'security camera', 'surveillance', 'home security', 'security installation', 'security company'],
    'alarm': ['security', 'security system', 'alarm', 'alarm system', 'security camera', 'surveillance', 'home security', 'security installation', 'security company'],
    
    // Windows & Doors
    'windows': ['windows', 'window', 'window replacement', 'window installation', 'window repair', 'window contractor', 'glass', 'glass repair', 'window company'],
    'doors': ['doors', 'door', 'door replacement', 'door installation', 'door repair', 'door contractor', 'garage door', 'garage door repair', 'door company'],
    
    // Insulation
    'insulation': ['insulation', 'insulate', 'insulation installation', 'insulation contractor', 'attic insulation', 'wall insulation', 'energy efficiency'],
    
    // Concrete/Masonry
    'concrete': ['concrete', 'concrete work', 'concrete contractor', 'concrete repair', 'concrete installation', 'driveway', 'patio', 'sidewalk', 'foundation'],
    'masonry': ['masonry', 'mason', 'stone work', 'brick', 'brick work', 'stone', 'fireplace', 'chimney', 'masonry contractor'],
  }
  
  return synonymMap[serviceType.toLowerCase()] || [serviceType]
}

// ============================================================================
// MATCHING HELPER FUNCTIONS
// ============================================================================

/**
 * Check if provider tags match any synonyms for a target type
 */
function tagsMatchSynonyms(tags: string[], targetType: string, synonymFn: (type: string) => string[]): boolean {
  if (!tags || !targetType) return false
  const synonyms = synonymFn(targetType)
  const lowerTags = tags.map(tag => tag.toLowerCase())
  
  return synonyms.some(synonym => 
    lowerTags.some(tag => 
      tag.includes(synonym.toLowerCase()) || 
      synonym.toLowerCase().includes(tag)
    )
  )
}

/**
 * Check if provider tags contain a keyword (simple matching)
 */
function tagsContainKeyword(tags: string[], keyword: string): boolean {
  if (!keyword || !tags) return false
  const lowerKeyword = keyword.toLowerCase()
  return tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
}

// ============================================================================
// CATEGORY-SPECIFIC SCORING FUNCTIONS
// ============================================================================

/**
 * Score providers for health-wellness category
 * Uses comprehensive synonym matching for medical/fitness/salon/wellness services
 */
function scoreHealthWellness(providers: Provider[], answers: Record<string, string>): Provider[] {
  const type = answers['type']
  const goal = answers['goal'] || answers['salon_kind']
  const when = answers['when']
  const payment = answers['payment']
  
  const scoredProviders = providers
    .map((p) => {
      let score = 0
      
      // Primary type matching with synonyms (highest weight)
      if (type && tagsMatchSynonyms(p.tags, type, getHealthWellnessSynonyms)) {
        score += 5
      }
      
      // Goal matching with synonyms (medium-high weight)
      if (goal && tagsMatchSynonyms(p.tags, goal, getHealthWellnessSynonyms)) {
        score += 3
      }
      
      // Secondary criteria (lower weight)
      if (when && tagsContainKeyword(p.tags, when)) score += 1
      if (payment && tagsContainKeyword(p.tags, payment)) score += 1
      
      // Base score if no criteria selected (show all providers)
      if (!type && !goal && !when && !payment) {
        score = 1
      }
      
      return { p, score }
    })
    .sort((a, b) => {
      // Featured providers first, but ONLY if they match the selected criteria
      const aIsFeatured = isFeaturedProvider(a.p)
      const bIsFeatured = isFeaturedProvider(b.p)
      
      // Check if featured providers match the selected type with synonyms
      const aFeaturedMatchesCriteria = aIsFeatured && (type || goal) ? 
        ((type && tagsMatchSynonyms(a.p.tags, type, getHealthWellnessSynonyms)) || 
         (goal && tagsMatchSynonyms(a.p.tags, goal, getHealthWellnessSynonyms))) : false
      const bFeaturedMatchesCriteria = bIsFeatured && (type || goal) ? 
        ((type && tagsMatchSynonyms(b.p.tags, type, getHealthWellnessSynonyms)) || 
         (goal && tagsMatchSynonyms(b.p.tags, goal, getHealthWellnessSynonyms))) : false
      
      // Only prioritize featured providers that match the criteria
      const am = aFeaturedMatchesCriteria ? 1 : 0
      const bm = bFeaturedMatchesCriteria ? 1 : 0
      if (bm !== am) return bm - am
      
      // If no specific criteria selected, fall back to original featured logic
      if (!type && !goal) {
        const amFallback = aIsFeatured ? 1 : 0
        const bmFallback = bIsFeatured ? 1 : 0
        if (bmFallback !== amFallback) return bmFallback - amFallback
      }
      
      // Sort by score (highest first)
      if (b.score !== a.score) return b.score - a.score
      
      // Then by rating
      const ar = a.p.rating ?? 0
      const br = b.p.rating ?? 0
      if (br !== ar) return br - ar
      
      // Finally by name
      return a.p.name.localeCompare(b.p.name)
    })
    .map((s) => s.p)
  
  return scoredProviders
}

/**
 * Score providers for real-estate category
 * Focuses on buying/selling/renting, property types, and staging
 */
function scoreRealEstate(providers: Provider[], answers: Record<string, string>): Provider[] {
  const need = answers['need']
  const propertyType = answers['property_type']
  const wantsStaging = answers['staging'] === 'yes'
  const stagerTags = new Set(['stager', 'staging'])
  
  return providers
    .filter((p) => {
      // Filter out stagers unless user wants staging
      const isStager = (p.tags || []).some((t) => stagerTags.has(t))
      return wantsStaging ? true : !isStager
    })
    .map((p) => {
      let score = 0
      
      // Strong signals (high weight)
      if (need && p.tags.includes(need)) score += 2
      if (propertyType && p.tags.includes(propertyType)) score += 2
      
      // Moderate signals (medium weight)
      if (answers['timeline'] && p.tags.includes(answers['timeline'])) score += 1
      if (answers['move_when'] && p.tags.includes(answers['move_when'])) score += 1
      if (answers['budget'] && p.tags.includes(answers['budget'])) score += 1
      if (answers['beds'] && p.tags.includes(answers['beds'])) score += 1
      if (wantsStaging && (p.tags.includes('staging') || p.tags.includes('stager'))) score += 1
      
      return { p, score }
    })
    .sort((a, b) => {
      // Featured providers first, but ONLY if they match the selected criteria
      const aIsFeatured = isFeaturedProvider(a.p)
      const bIsFeatured = isFeaturedProvider(b.p)
      
      // Check if featured providers match the selected need/property type
      const aFeaturedMatchesCriteria = aIsFeatured && (need || propertyType) ? 
        ((need && a.p.tags.includes(need)) || (propertyType && a.p.tags.includes(propertyType))) : false
      const bFeaturedMatchesCriteria = bIsFeatured && (need || propertyType) ? 
        ((need && b.p.tags.includes(need)) || (propertyType && b.p.tags.includes(propertyType))) : false
      
      // Only prioritize featured providers that match the criteria
      const am = aFeaturedMatchesCriteria ? 1 : 0
      const bm = bFeaturedMatchesCriteria ? 1 : 0
      if (bm !== am) return bm - am
      
      // If no specific criteria selected, fall back to original featured logic
      if (!need && !propertyType) {
        const amFallback = aIsFeatured ? 1 : 0
        const bmFallback = bIsFeatured ? 1 : 0
        if (bmFallback !== amFallback) return bmFallback - amFallback
      }
      
      if (b.score !== a.score) return b.score - a.score
      const ar = a.p.rating ?? 0
      const br = b.p.rating ?? 0
      if (br !== ar) return br - ar
      return a.p.name.localeCompare(b.p.name)
    })
    .map((s) => s.p)
}

/**
 * Score providers for restaurants-cafes category
 * Focuses on cuisine types, occasion, price range, and service style
 */
function scoreRestaurants(providers: Provider[], answers: Record<string, string>): Provider[] {
  const cuisine = answers['cuisine']?.toLowerCase()
  const occasion = answers['occasion']?.toLowerCase()
  const price = answers['price']?.toLowerCase()
  const service = answers['service']?.toLowerCase()
  
  // Get all related terms for the selected cuisine
  const cuisineSynonyms = cuisine ? getCuisineSynonyms(cuisine) : []
  const values = new Set<string>(Object.values(answers).map(v => v.toLowerCase()))
  const allCuisineTerms = new Set([...cuisineSynonyms, ...values])
  
  return providers
    .map((p) => {
      let score = 0
      
      // CUISINE MATCHING: Check for exact cuisine match first, then synonyms
      if (cuisine) {
        // Exact match gets highest score
        if (p.tags.some(t => t.toLowerCase() === cuisine)) {
          score += 4
        } else {
          // Check for cuisine synonyms
          const cuisineMatch = p.tags.some(t => {
            const tagLower = t.toLowerCase()
            return cuisineSynonyms.some(synonym => 
              tagLower === synonym || 
              tagLower.includes(synonym) || 
              synonym.includes(tagLower)
            )
          })
          if (cuisineMatch) score += 3
        }
      }
      
      // OTHER MATCHES: Occasion, price, service
      if (occasion && p.tags.some(t => t.toLowerCase() === occasion)) score += 2
      if (price && p.tags.some(t => t.toLowerCase() === price)) score += 2
      if (service && p.tags.some(t => t.toLowerCase() === service)) score += 2
      
      // GENERAL TAG MATCHES: Check all answer values and cuisine terms
      p.tags.forEach((t) => { 
        const tagLower = t.toLowerCase()
        if (allCuisineTerms.has(tagLower)) score += 1
      })
      
      return { p, score }
    })
    .sort((a, b) => {
      // Featured providers first, but ONLY if they match the selected cuisine
      const aIsFeatured = isFeaturedProvider(a.p)
      const bIsFeatured = isFeaturedProvider(b.p)
      
      // Check if featured providers match the selected cuisine
      const aFeaturedMatchesCuisine = aIsFeatured && cuisine ? 
        (a.p.tags.some(t => t.toLowerCase() === cuisine) || 
         a.p.tags.some(t => {
           const tagLower = t.toLowerCase()
           return cuisineSynonyms.some(synonym => 
             tagLower === synonym || 
             tagLower.includes(synonym) || 
             synonym.includes(tagLower)
           )
         })) : false
         
      const bFeaturedMatchesCuisine = bIsFeatured && cuisine ? 
        (b.p.tags.some(t => t.toLowerCase() === cuisine) || 
         b.p.tags.some(t => {
           const tagLower = t.toLowerCase()
           return cuisineSynonyms.some(synonym => 
             tagLower === synonym || 
             tagLower.includes(synonym) || 
             synonym.includes(tagLower)
           )
         })) : false
      
      // Only prioritize featured providers that match the cuisine
      const am = aFeaturedMatchesCuisine ? 1 : 0
      const bm = bFeaturedMatchesCuisine ? 1 : 0
      if (bm !== am) return bm - am
      
      // If no cuisine selected, fall back to original featured logic
      if (!cuisine) {
        const amFallback = aIsFeatured ? 1 : 0
        const bmFallback = bIsFeatured ? 1 : 0
        if (bmFallback !== amFallback) return bmFallback - amFallback
      }
      
      if (b.score !== a.score) return b.score - a.score
      const ar = a.p.rating ?? 0
      const br = b.p.rating ?? 0
      if (br !== ar) return br - ar
      return a.p.name.localeCompare(b.p.name)
    })
    .map((s) => s.p)
}

/**
 * Score providers for home-services category
 * Uses comprehensive synonym matching for all home service types
 */
function scoreHomeServices(providers: Provider[], answers: Record<string, string>): Provider[] {
  const type = answers['type']
  const goal = answers['goal'] || answers['urgency']
  const when = answers['urgency']
  const budget = answers['budget']
  
  const scoredProviders = providers
    .map((p) => {
      let score = 0
      
      // Primary type matching with synonyms (highest weight)
      if (type && tagsMatchSynonyms(p.tags, type, getHomeServicesSynonyms)) {
        score += 5
      }
      
      // Goal matching with synonyms (medium-high weight)
      if (goal && tagsMatchSynonyms(p.tags, goal, getHomeServicesSynonyms)) {
        score += 3
      }
      
      // Secondary criteria (lower weight)
      if (when && tagsContainKeyword(p.tags, when)) score += 1
      if (budget && tagsContainKeyword(p.tags, budget)) score += 1
      
      // Base score if no criteria selected (show all providers)
      if (!type && !goal && !when && !budget) {
        score = 1
      }
      
      return { p, score }
    })
    .sort((a, b) => {
      // Featured providers first, but ONLY if they match the selected criteria
      const aIsFeatured = isFeaturedProvider(a.p)
      const bIsFeatured = isFeaturedProvider(b.p)
      
      // Check if featured providers match the selected type with synonyms
      const aFeaturedMatchesCriteria = aIsFeatured && (type || goal) ? 
        ((type && tagsMatchSynonyms(a.p.tags, type, getHomeServicesSynonyms)) || 
         (goal && tagsMatchSynonyms(a.p.tags, goal, getHomeServicesSynonyms))) : false
      const bFeaturedMatchesCriteria = bIsFeatured && (type || goal) ? 
        ((type && tagsMatchSynonyms(b.p.tags, type, getHomeServicesSynonyms)) || 
         (goal && tagsMatchSynonyms(b.p.tags, goal, getHomeServicesSynonyms))) : false
      
      // Only prioritize featured providers that match the criteria
      const am = aFeaturedMatchesCriteria ? 1 : 0
      const bm = bFeaturedMatchesCriteria ? 1 : 0
      if (bm !== am) return bm - am
      
      // If no specific criteria selected, fall back to original featured logic
      if (!type && !goal) {
        const amFallback = aIsFeatured ? 1 : 0
        const bmFallback = bIsFeatured ? 1 : 0
        if (bmFallback !== amFallback) return bmFallback - amFallback
      }
      
      // Sort by score (highest first)
      if (b.score !== a.score) return b.score - a.score
      
      // Then by rating
      const ar = a.p.rating ?? 0
      const br = b.p.rating ?? 0
      if (br !== ar) return br - ar
      
      // Finally by name
      return a.p.name.localeCompare(b.p.name)
    })
    .map((s) => s.p)
  
  return scoredProviders
}

/**
 * Generic scoring for professional-services and other categories
 * Uses simple tag matching without synonym expansion
 */
function scoreGeneric(providers: Provider[], answers: Record<string, string>): Provider[] {
  const values = new Set<string>(Object.values(answers))
  const withScores = providers.map((p) => {
    const matches = p.tags.reduce((acc, t) => acc + (values.has(t) ? 1 : 0), 0)
    return { p, score: matches }
  })
  
  withScores.sort((a, b) => {
    // Featured providers first, but ONLY if they match the selected criteria
    const aIsFeatured = isFeaturedProvider(a.p)
    const bIsFeatured = isFeaturedProvider(b.p)
    
    // For generic categories, check if featured providers match any selected criteria
    const aFeaturedMatchesCriteria = aIsFeatured && values.size > 0 ? 
      a.p.tags.some(t => values.has(t)) : false
    const bFeaturedMatchesCriteria = bIsFeatured && values.size > 0 ? 
      b.p.tags.some(t => values.has(t)) : false
    
    // Only prioritize featured providers that match the criteria
    const am = aFeaturedMatchesCriteria ? 1 : 0
    const bm = bFeaturedMatchesCriteria ? 1 : 0
    if (bm !== am) return bm - am
    
    // If no specific criteria selected, fall back to original featured logic
    if (values.size === 0) {
      const amFallback = aIsFeatured ? 1 : 0
      const bmFallback = bIsFeatured ? 1 : 0
      if (bmFallback !== amFallback) return bmFallback - amFallback
    }
    
    if (b.score !== a.score) return b.score - a.score
    const ar = a.p.rating ?? 0
    const br = b.p.rating ?? 0
    if (br !== ar) return br - ar
    return a.p.name.localeCompare(b.p.name)
  })
  
  return withScores.map((s) => s.p)
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Score and sort providers based on category and user answers
 * 
 * This is the main entry point for provider scoring. It routes to
 * category-specific scoring functions that use appropriate matching
 * algorithms (synonym-based, tag-based, etc.)
 * 
 * @param category - The business category key
 * @param answers - User's funnel answers (question_id -> option_id)
 * @param providersByCategory - All providers organized by category
 * @returns Scored and sorted providers for the specified category
 * 
 * @example
 * const results = scoreProviders('restaurants-cafes', { cuisine: 'mexican' }, providers)
 */
export function scoreProviders(
  category: CategoryKey,
  answers: Record<string, string>,
  providersByCategory: Record<CategoryKey, Provider[]>
): Provider[] {
  // Get providers for the specified category only
  const providers = providersByCategory[category] || []
  
  // Route to category-specific scoring function
  switch (category) {
    case 'health-wellness':
      return scoreHealthWellness(providers, answers)
    
    case 'real-estate':
      return scoreRealEstate(providers, answers)
    
    case 'restaurants-cafes':
      return scoreRestaurants(providers, answers)
    
    case 'home-services':
      return scoreHomeServices(providers, answers)
    
    case 'professional-services':
    default:
      return scoreGeneric(providers, answers)
  }
}

