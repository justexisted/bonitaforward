import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { insert } from '../lib/supabaseQuery'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORY_OPTIONS } from '../constants/categories'

export default function CreateBusinessForm() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [businessName, setBusinessName] = useState('')
  const [category, setCategory] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Prevent duplicate submissions - check if already busy
    if (busy) {
      console.log('[CreateBusinessForm] Already submitting, ignoring duplicate click')
      return
    }
    
    setBusy(true)
    setMessage(null)
    
    try {
      if (!auth.email || !auth.userId) {
        setMessage('You must be signed in to submit a business listing.')
        setBusy(false)
        return
      }

      if (!businessName || !category) {
        setMessage('Please fill in Business Name and Category.')
        setBusy(false)
        return
      }

      // CRITICAL: Match MyBusiness createBusinessListing structure exactly
      // IMPORTANT: business_applications table uses 'category' NOT 'category_key'
      // IMPORTANT: Always use auth.email so the application shows up in the user's account
      const payload: any = { 
        business_name: businessName,
        full_name: auth.name || 'Business Owner', // Match MyBusiness format
        email: auth.email, // Always use auth.email to ensure application shows in My Business page
        category: category, // Note: 'category' not 'category_key'
        phone: phone || '',
        status: 'pending', // Set initial status as pending
        tier_requested: 'free' as 'free' | 'featured', // Default to free tier
        // Store additional details as JSON string in the challenge field (matching MyBusiness structure)
        // Store the business contact email separately from account email
        challenge: JSON.stringify({
          website: null,
          address: address || null,
          description: null,
          tags: null,
          specialties: null,
          social_links: null,
          business_hours: null,
          service_areas: null,
          google_maps_url: null,
          bonita_resident_discount: null,
          images: null,
          business_contact_email: businessEmail || null  // Store business email separately from account email
        })
      }
      
      console.log('[CreateBusinessForm] Submitting application data:', payload)
      
      // Uses centralized query utility with retry logic and standardized error handling
      const result = await insert(
        'business_applications',
        [payload],
        { logPrefix: '[CreateBusinessForm]' }
      )
      
      console.log('[CreateBusinessForm] Application insert result:', { data: result.data, error: result.error })

      if (result.error) {
        // Error already logged by query utility
        setMessage(`Error submitting application: ${result.error.message}`)
      } else {
        setMessage('Success! Your business application has been submitted and is pending admin approval.')
        // Redirect to account page after 2 seconds (matching MyBusiness behavior)
        setTimeout(() => {
          navigate('/account')
        }, 2000)
      }
    } catch (error: any) {
      console.error('[CreateBusinessForm] Unexpected error:', error)
      setMessage(`Error submitting application: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
      <input 
        required
        value={businessName} 
        onChange={(e) => setBusinessName(e.target.value)} 
        className="rounded-xl border border-neutral-200 px-3 py-2" 
        placeholder="Business Name *" 
      />
      
      <select 
        required
        value={category} 
        onChange={(e) => setCategory(e.target.value)} 
        className="rounded-xl border border-neutral-200 px-3 py-2 bg-white"
      >
        <option value="">Select Category *</option>
        {CATEGORY_OPTIONS.map((cat) => (
          <option key={cat.key} value={cat.key}>{cat.name}</option>
        ))}
      </select>

      <input 
        type="email"
        value={businessEmail} 
        onChange={(e) => setBusinessEmail(e.target.value)} 
        className="rounded-xl border border-neutral-200 px-3 py-2" 
        placeholder="Business Email (optional)" 
      />

      <input 
        value={address} 
        onChange={(e) => setAddress(e.target.value)} 
        className="rounded-xl border border-neutral-200 px-3 py-2" 
        placeholder="Business Address (optional)" 
      />

      <input 
        value={phone} 
        onChange={(e) => setPhone(e.target.value)} 
        className="rounded-xl border border-neutral-200 px-3 py-2" 
        placeholder="Business Phone (optional)" 
      />

      <button 
        type="submit"
        disabled={busy} 
        className={`rounded-full py-3 elevate w-full font-medium transition-all flex items-center justify-center gap-2 ${
          busy 
            ? 'bg-blue-500 text-white cursor-wait shadow-lg' 
            : 'bg-neutral-900 text-white hover:bg-neutral-800 hover:shadow-md cursor-pointer'
        }`}
      >
        {busy ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Submitting Application...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Submit Business Listing</span>
          </>
        )}
      </button>
      
      {message && <div className="text-sm text-neutral-700">{message}</div>}
    </form>
  )
}


