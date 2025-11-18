/**
 * FUNNEL QUESTIONS CONFIGURATION
 * 
 * This file contains all funnel questions and configuration for different business categories.
 * The funnel helps users find the best providers by asking them questions about their needs.
 * 
 * Categories:
 * - Real Estate (buying/selling, timeline, budget, bedrooms)
 * - Home Services (service type, timeline, budget, property type)
 * - Health & Wellness (service type, frequency, experience, location)
 * - Restaurants & Cafes (occasion, cuisine, price range, dietary)
 * - Professional Services (service type, urgency, business size, budget)
 * - Retail (product type, occasion, price range, preferences)
 * 
 * Each category has 4 questions to keep the funnel quick and user-friendly.
 */

import type { CategoryKey, FunnelOption, FunnelQuestion } from '../types'

// Re-export types for backward compatibility
export type { FunnelOption, FunnelQuestion }

// ============================================================================
// FUNNEL CONFIGURATION
// ============================================================================

/**
 * Complete funnel configuration for all categories
 * Each category has up to 4 questions to balance thoroughness with user experience
 */
export const funnelConfig: Record<CategoryKey, FunnelQuestion[]> = {
  'real-estate': [
    { 
      id: 'need', 
      prompt: 'What do you need help with?', 
      options: [ 
        { id: 'buy', label: 'Buying' }, 
        { id: 'sell', label: 'Selling' }, 
        { id: 'rent', label: 'Renting' } 
      ] 
    },
    { 
      id: 'timeline', 
      prompt: "What's your timeline?", 
      options: [ 
        { id: '0-3', label: '0–3 months' }, 
        { id: '3-6', label: '3–6 months' }, 
        { id: '6+', label: '6+ months' } 
      ] 
    },
    { 
      id: 'budget', 
      prompt: 'Approximate budget?', 
      options: [ 
        { id: 'entry', label: '$' }, 
        { id: 'mid', label: '$$' }, 
        { id: 'high', label: '$$$' } 
      ] 
    },
    { 
      id: 'beds', 
      prompt: 'Bedrooms', 
      options: [ 
        { id: '2', label: '2+' }, 
        { id: '3', label: '3+' }, 
        { id: '4', label: '4+' } 
      ] 
    },
  ],
  'home-services': [
    {
      id: 'type',
      prompt: 'Which service do you need?',
      options: [
        { id: 'landscaping', label: 'Landscaping' },
        { id: 'solar', label: 'Solar' },
        { id: 'cleaning', label: 'Cleaning' },
        { id: 'remodeling', label: 'Remodeling' },
        { id: 'plumbing', label: 'Plumbing' },
        { id: 'electrical', label: 'Electrical' },
        { id: 'hvac', label: 'HVAC' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'timeline',
      prompt: "What's your timeline?",
      options: [
        { id: 'asap', label: 'ASAP' },
        { id: '1-month', label: 'Within 1 month' },
        { id: '3-months', label: 'Within 3 months' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Approximate budget?',
      options: [
        { id: 'under-1k', label: 'Under $1,000' },
        { id: '1k-5k', label: '$1,000 - $5,000' },
        { id: '5k-10k', label: '$5,000 - $10,000' },
        { id: '10k-plus', label: '$10,000+' },
      ],
    },
    {
      id: 'property-type',
      prompt: 'Property type?',
      options: [
        { id: 'single-family', label: 'Single Family' },
        { id: 'condo', label: 'Condo' },
        { id: 'townhouse', label: 'Townhouse' },
        { id: 'commercial', label: 'Commercial' },
      ],
    },
  ],
  'health-wellness': [
    {
      id: 'type',
      prompt: 'What type of service?',
      options: [
        { id: 'dental', label: 'Dental' },
        { id: 'chiropractor', label: 'Chiropractor' },
        { id: 'gym', label: 'Gym/Fitness' },
        { id: 'salon', label: 'Salon/Beauty' },
        { id: 'spa', label: 'Spa/MedSpa' },
        { id: 'medical', label: 'Medical' },
        { id: 'therapy', label: 'Therapy' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'frequency',
      prompt: 'How often do you need this service?',
      options: [
        { id: 'one-time', label: 'One-time' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'as-needed', label: 'As needed' },
      ],
    },
    {
      id: 'experience',
      prompt: 'Experience level?',
      options: [
        { id: 'beginner', label: 'Beginner' },
        { id: 'intermediate', label: 'Intermediate' },
        { id: 'advanced', label: 'Advanced' },
        { id: 'any', label: 'Any level' },
      ],
    },
    {
      id: 'location',
      prompt: 'Preferred location?',
      options: [
        { id: 'bonita', label: 'Bonita' },
        { id: 'nearby', label: 'Nearby areas' },
        { id: 'flexible', label: 'Flexible' },
      ],
    },
  ],
  'restaurants-cafes': [
    {
      id: 'occasion',
      prompt: 'What\'s the occasion?',
      options: [
        { id: 'casual', label: 'Casual dining' },
        { id: 'date-night', label: 'Date night' },
        { id: 'family', label: 'Family meal' },
        { id: 'business', label: 'Business meeting' },
        { id: 'celebration', label: 'Celebration' },
        { id: 'quick-bite', label: 'Quick bite' },
      ],
    },
    {
      id: 'cuisine',
      prompt: 'Cuisine preference?',
      options: [
        { id: 'american', label: 'American' },
        { id: 'italian', label: 'Italian' },
        { id: 'mexican', label: 'Mexican' },
        { id: 'asian', label: 'Asian' },
        { id: 'mediterranean', label: 'Mediterranean' },
        { id: 'any', label: 'Any cuisine' },
      ],
    },
    {
      id: 'price-range',
      prompt: 'Price range?',
      options: [
        { id: 'budget', label: '$ (Budget-friendly)' },
        { id: 'moderate', label: '$$ (Moderate)' },
        { id: 'upscale', label: '$$$ (Upscale)' },
        { id: 'fine-dining', label: '$$$$ (Fine dining)' },
      ],
    },
    {
      id: 'dietary',
      prompt: 'Dietary restrictions?',
      options: [
        { id: 'none', label: 'None' },
        { id: 'vegetarian', label: 'Vegetarian' },
        { id: 'vegan', label: 'Vegan' },
        { id: 'gluten-free', label: 'Gluten-free' },
        { id: 'keto', label: 'Keto' },
      ],
    },
  ],
  'professional-services': [
    {
      id: 'service',
      prompt: 'What service do you need?',
      options: [
        { id: 'legal', label: 'Legal' },
        { id: 'accounting', label: 'Accounting' },
        { id: 'consulting', label: 'Consulting' },
        { id: 'marketing', label: 'Marketing' },
        { id: 'insurance', label: 'Insurance' },
        { id: 'financial', label: 'Financial Planning' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'urgency',
      prompt: 'How urgent is this?',
      options: [
        { id: 'urgent', label: 'Very urgent' },
        { id: 'soon', label: 'Within a month' },
        { id: 'planning', label: 'Planning ahead' },
        { id: 'exploring', label: 'Just exploring' },
      ],
    },
    {
      id: 'business-size',
      prompt: 'Business size?',
      options: [
        { id: 'individual', label: 'Individual' },
        { id: 'small', label: 'Small business' },
        { id: 'medium', label: 'Medium business' },
        { id: 'enterprise', label: 'Enterprise' },
      ],
    },
    {
      id: 'budget',
      prompt: 'Budget range?',
      options: [
        { id: 'under-1k', label: 'Under $1,000' },
        { id: '1k-5k', label: '$1,000 - $5,000' },
        { id: '5k-15k', label: '$5,000 - $15,000' },
        { id: '15k-plus', label: '$15,000+' },
      ],
    },
  ],
  'retail': [
    {
      id: 'product-type',
      prompt: 'What are you shopping for?',
      options: [
        { id: 'clothing', label: 'Clothing & Apparel' },
        { id: 'electronics', label: 'Electronics' },
        { id: 'home-goods', label: 'Home & Garden' },
        { id: 'gifts', label: 'Gifts & Specialty Items' },
        { id: 'sports', label: 'Sports & Outdoors' },
        { id: 'beauty', label: 'Beauty & Personal Care' },
        { id: 'other', label: 'Other' },
      ],
    },
    {
      id: 'occasion',
      prompt: 'Shopping for?',
      options: [
        { id: 'personal', label: 'Personal use' },
        { id: 'gift', label: 'Gift' },
        { id: 'business', label: 'Business' },
        { id: 'special-event', label: 'Special event' },
        { id: 'browsing', label: 'Just browsing' },
      ],
    },
    {
      id: 'price-range',
      prompt: 'Price range?',
      options: [
        { id: 'budget', label: 'Budget-friendly' },
        { id: 'mid-range', label: 'Mid-range' },
        { id: 'premium', label: 'Premium/Luxury' },
        { id: 'any', label: 'Any price' },
      ],
    },
    {
      id: 'preferences',
      prompt: 'What matters most?',
      options: [
        { id: 'local', label: 'Supporting local' },
        { id: 'quality', label: 'Quality & durability' },
        { id: 'unique', label: 'Unique items' },
        { id: 'convenience', label: 'Convenience' },
        { id: 'value', label: 'Best value' },
      ],
    },
  ],
}

// ============================================================================
// FUNNEL QUESTION GETTER
// ============================================================================

/**
 * Get funnel questions for a specific category
 * 
 * Returns up to 4 questions for the specified category.
 * Real estate has a custom question list, while other categories
 * use the first 4 questions from their respective configurations.
 * 
 * @param categoryKey - The category to get questions for
 * @param _answers - User's current answers (unused but kept for future use)
 * @returns Array of funnel questions for the category
 * 
 * @example
 * const questions = getFunnelQuestions('restaurants-cafes', {})
 * // Returns 4 questions about occasion, cuisine, price, and dietary preferences
 */
export function getFunnelQuestions(
  categoryKey: CategoryKey, 
  _answers: Record<string, string>
): FunnelQuestion[] {
  // Real estate uses a simplified question set
  if (categoryKey === 'real-estate') {
    const list = [
      { 
        id: 'need', 
        prompt: 'What do you need help with?', 
        options: [ 
          { id: 'buy', label: 'Buying' }, 
          { id: 'sell', label: 'Selling' }, 
          { id: 'rent', label: 'Renting' } 
        ] 
      },
      { 
        id: 'timeline', 
        prompt: "What's your timeline?", 
        options: [ 
          { id: '0-3', label: '0–3 months' }, 
          { id: '3-6', label: '3–6 months' }, 
          { id: '6+', label: '6+ months' } 
        ] 
      },
      { 
        id: 'budget', 
        prompt: 'Approximate budget?', 
        options: [ 
          { id: 'entry', label: '$' }, 
          { id: 'mid', label: '$$' }, 
          { id: 'high', label: '$$$' } 
        ] 
      },
      { 
        id: 'beds', 
        prompt: 'Bedrooms', 
        options: [ 
          { id: '2', label: '2+' }, 
          { id: '3', label: '3+' }, 
          { id: '4', label: '4+' } 
        ] 
      },
    ]
    return list.slice(0, 4)
  }
  
  // Validate category exists in config before accessing
  if (!funnelConfig[categoryKey]) {
    console.warn(`[Funnel] Category '${categoryKey}' not found in funnelConfig, returning empty array`)
    return []
  }
  
  // Other categories use their standard configuration
  const questions = funnelConfig[categoryKey]
  return questions && Array.isArray(questions) ? questions.slice(0, 4) : []
}

