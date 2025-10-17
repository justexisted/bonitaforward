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
