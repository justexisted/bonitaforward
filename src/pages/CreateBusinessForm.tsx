import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

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
    setBusy(true)
    setMessage(null)
    
    try {
      if (!auth.email || !auth.userId) {
        setMessage('You must be signed in to submit a business listing.')
        return
      }

      if (!businessName || !category) {
        setMessage('Please fill in Business Name and Category.')
        return
      }

      const payload: any = { 
        business_name: businessName,
        email: auth.email, // Use signed-in user's email
        category: category,
        phone: phone || null,
        // Store business-specific details in challenge field (we'll parse it later)
        challenge: JSON.stringify({
          businessEmail: businessEmail || null,
          address: address || null
        })
      }
      
      const { error } = await supabase.from('business_applications').insert([payload])
      
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Success! Your business listing request has been submitted. Redirecting to your account...')
        // Redirect to account page after 2 seconds
        setTimeout(() => {
          navigate('/account')
        }, 2000)
      }
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
        <option value="real-estate">Real Estate</option>
        <option value="home-services">Home Services</option>
        <option value="health-wellness">Health & Wellness</option>
        <option value="restaurants-cafes">Restaurants & Cafes</option>
        <option value="professional-services">Professional Services</option>
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

      <button disabled={busy} className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">
        {busy ? 'Submitting…' : 'Submit Business Listing'}
      </button>
      
      {message && <div className="text-sm text-neutral-700">{message}</div>}
    </form>
  )
}


