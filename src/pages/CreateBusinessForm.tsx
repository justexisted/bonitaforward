import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CreateBusinessForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const payload: any = { business_name: name || null, email: email || null, phone: phone || null }
      const { error } = await supabase.from('business_applications').insert([payload])
      if (error) setMessage(error.message)
      else setMessage('Thanks! We received your business details. We’ll follow up shortly.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
      <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Business Name" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Email" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl border border-neutral-200 px-3 py-2" placeholder="Phone" />
      </div>
      <button disabled={busy} className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full">{busy ? 'Submitting…' : 'Submit'}</button>
      {message && <div className="text-sm text-neutral-700">{message}</div>}
    </form>
  )
}


