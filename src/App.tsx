import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ResetPasswordPage from './pages/ResetPassword'
import './index.css'
import SignInPage from './pages/SignIn'
import OnboardingPage from './pages/Onboarding'
import AccountPage from './pages/Account'
import { CommunityIndex, CommunityPost } from './pages/Community'
import AdminPage from './pages/Admin'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import OwnerPage from './pages/Owner'
import MyBusinessPage from './pages/MyBusiness'
import PricingPage from './pages/Pricing'
import JobsPage from './pages/Jobs'
import CalendarPage from './pages/Calendar'
import NotFoundPage from './pages/NotFound'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AppInit from './components/AppInit'
import ProviderPage from './pages/ProviderPage'
import CategoryPage from './pages/CategoryPage'
import BookPage from './pages/BookPage'
import BusinessPage from './pages/BusinessPage'
import HomePage from './pages/HomePage'
import ThankYouPage from './pages/ThankYouPage'
import type { CategoryKey, Provider } from './types'
import { scoreProviders } from './utils/providerScoring'

const categories: {
  key: CategoryKey
  name: string
  description: string
  icon: string
}[] = [
  {
    key: 'restaurants-cafes',
    name: 'Restaurants & Cafés',
    description: 'Local dining spots and trending food experiences around Bonita.',
    icon: '/images/categories/Utensils.png',
  },
  {
    key: 'home-services',
    name: 'Home Services',
    description: 'Landscaping, solar, cleaning, and remodeling by trusted local pros.',
    icon: '/images/categories/Home.png',
  },
  {
    key: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Chiropractors, gyms, salons, and med spas to keep Bonita thriving.',
    icon: '/images/categories/HeartPulse.png',
  },
  {
    key: 'real-estate',
    name: 'Real Estate',
    description: 'Agents, brokerages, and property managers helping Bonita residents move forward.',
    icon: '/images/categories/Building2.png',
  },
  {
    key: 'professional-services',
    name: 'Professional Services',
    description: 'Attorneys, accountants, and consultants serving the community.',
    icon: '/images/categories/Briefcase.png',
  },
]

// ============================================================================
// UTILITY FUNCTIONS - Extracted from duplicate code for maintainability
// ============================================================================


/**
 * Safely get and parse JSON from localStorage with type safety
 */
// getLocalStorageJSON moved to pages that use it



// getAllProviders function moved to ProviderPage.tsx

// useProviderUpdates moved to src/pages/HomePage.tsx

// LoadingSpinner moved to src/pages/HomePage.tsx

// Container moved to src/pages/HomePage.tsx








/**
 * PROVIDER PAGE
 * 
 * This page displays comprehensive business information for community users.
 * It shows all the enhanced business details that business owners can manage
 * through their "My Business" dashboard.
 * 
 * Features:
 * - Business description and images
 * - Contact information (phone, email, website, address)
 * - Specialties and service areas
 * - Business hours and social media links
 * - Featured business badge and rating display
 * - Job postings (if any)
 * - Save business and coupon functionality for community users
 */
// ProviderPage component has been moved to src/pages/ProviderPage.tsx

// CategoryCard moved to src/pages/HomePage.tsx

// CalendarSection moved to src/pages/HomePage.tsx

// CommunitySection moved to src/pages/HomePage.tsx

// Confetti moved to src/pages/ThankYouPage.tsx

// ThankYouPage moved to src/pages/ThankYouPage.tsx

// HomePage moved to src/pages/HomePage.tsx

// Removed old LeadForm in favor of the new 4-step Funnel

// FunnelOption type has been moved to src/pages/CategoryPage.tsx

// FunnelQuestion type has been moved to src/pages/CategoryPage.tsx

// funnelConfig has been moved to src/pages/CategoryPage.tsx

// Provider type imported from src/utils/helpers.ts
// ensureDemoMembers imported from src/utils/helpers.ts


// ProviderDetails type moved to src/pages/BookPage.tsx

// Removed unused providerDescriptions/getProviderDescription to satisfy TypeScript build

// generateSlug imported from src/utils/helpers.ts
// isFeaturedProvider imported from src/utils/helpers.ts

// getProviderDetails moved to src/pages/BookPage.tsx

// providersByCategory moved to App component state

// loadProvidersFromSheet moved to src/services/providerService.ts
// loadProvidersFromSupabase moved to src/services/providerService.ts

// ============================================================================
// PROVIDER SCORING LOGIC
// ============================================================================

// scoreProviders function moved to src/utils/providerScoring.ts

/*
// OLD IMPLEMENTATION - Now in src/utils/providerScoring.ts
// This 540-line function has been extracted for better maintainability
// See src/utils/providerScoring.ts for the complete implementation
function scoreProviders(...) { ... }
*/

// persistFunnelForUser function has been moved to src/pages/CategoryPage.tsx

// Removed createBookingRow function - no longer needed since form submission is removed

/**
 * BUSINESS APPLICATION SUBMISSION
 * 
 * This function handles business application submissions from the /business page.
 * It stores applications in the 'business_applications' table for admin review.
 * 
 * NOTE: The tier parameter is captured but not stored in database yet.
 * You need to add 'tier_requested' and 'status' columns to business_applications table.
 * 
 * Current flow:
 * 1. User fills form on /business page (selects free or featured tier)
 * 2. Application is submitted to business_applications table
 * 3. User is redirected to create business account
 * 4. User can then go to My Business page to request free listings
 */
// createBusinessApplication moved to src/pages/BusinessPage.tsx

// (Kept for backward compatibility with older forms)
// Removed unused createContactLead implementation after migrating contact to general user form

// getFunnelQuestions function has been moved to src/pages/CategoryPage.tsx

// trackChoice function has been moved to src/pages/CategoryPage.tsx

// Funnel component has been moved to src/pages/CategoryPage.tsx

// CategoryFilters component has been moved to src/pages/CategoryPage.tsx

// CategoryPage component has been moved to src/pages/CategoryPage.tsx
// AboutPage component has been moved to src/pages/AboutPage.tsx
// ContactPage component has been moved to src/pages/ContactPage.tsx

// BusinessPage moved to src/pages/BusinessPage.tsx

// fixImageUrl moved to src/pages/BookPage.tsx

// BookPage moved to src/pages/BookPage.tsx

// AppInit component moved to src/components/AppInit.tsx

export default function App() {
  const [providersByCategory, setProvidersByCategory] = useState<Record<CategoryKey, Provider[]>>({
    'real-estate': [],
    'home-services': [],
    'health-wellness': [],
    'restaurants-cafes': [],
    'professional-services': [],
  })

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppInit setProvidersByCategory={setProvidersByCategory} />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage providersByCategory={providersByCategory as any} />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="signin" element={<SignInPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="community" element={<CommunityIndex />} />
            <Route path="community/:category" element={<CommunityPost />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="owner" element={
              <ProtectedRoute allowedRoles={['business']}>
                <OwnerPage />
              </ProtectedRoute>
            } />
            <Route path="my-business" element={
              <ProtectedRoute allowedRoles={['business']}>
                <MyBusinessPage />
              </ProtectedRoute>
            } />
            <Route path="pricing" element={
              <ProtectedRoute allowedRoles={['business']}>
                <PricingPage />
              </ProtectedRoute>
            } />
            <Route path="account" element={<AccountPage />} />
            <Route path="book" element={<BookPage categories={categories} scoreProviders={(category, answers) => scoreProviders(category, answers, providersByCategory)} providersByCategory={providersByCategory} />} />
            <Route path="business" element={<BusinessPage />} />
            <Route path="category/:id" element={<CategoryPage categories={categories} scoreProviders={(category, answers) => scoreProviders(category, answers, providersByCategory)} />} />
            <Route path="provider/:id" element={<ProviderPage providersByCategory={providersByCategory} />} />
            <Route path="thank-you" element={<ThankYouPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
