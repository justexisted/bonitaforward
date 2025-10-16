import { useState } from 'react'
import { createContactLead, type ContactLead } from '../lib/supabaseData'

// Container component (copied from App.tsx)
function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

export default function ContactPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)

    const form = e.currentTarget as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value
    const subject = (form.elements.namedItem('subject') as HTMLInputElement)?.value
    const messageText = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value

    try {
      // Create contact lead object
      const contactLead: Omit<ContactLead, 'id' | 'created_at'> = {
        business_name: name,
        contact_email: email,
        details: `Subject: ${subject}\n\nMessage: ${messageText}`
      }

      // Insert into database using the reusable function
      const createdLead = await createContactLead(contactLead)
      console.log('Contact lead created successfully:', createdLead)
      
      // Store in localStorage as backup (existing functionality)
      try { 
        localStorage.setItem('bf-user-contact', JSON.stringify({ 
          name, 
          email, 
          subject, 
          message: messageText, 
          ts: Date.now() 
        })) 
      } catch (localStorageError) {
        console.warn('Failed to store contact in localStorage:', localStorageError)
      }

      // Reset form
      form.reset()
      
      // Show success message and redirect
      setMessage('Thank you for your message! We\'ll get back to you soon.')
      
      // Redirect to thank you page after a brief delay
      setTimeout(() => {
        window.location.assign('/thank-you')
      }, 2000)

    } catch (err) {
      console.error('Unexpected error submitting contact form:', err)
      setError('An unexpected error occurred. Please try again or contact us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-8">
      <Container>
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white elevate max-w-xl mx-auto">
          <h2 className="text-xl font-semibold tracking-tight">Contact Bonita Forward</h2>
          <p className="mt-1 text-neutral-600">
            Have a question or feedback? Reach us at{' '}
            <a href="mailto:bonitaforward@gmail.com" className="underline">
              bonitaforward@gmail.com
            </a>{' '}
            or call{' '}
            <a href="tel:+16197075351" className="underline">
              (619) 707-5351
            </a>
            .
          </p>
          
          {/* Success Message */}
          {message && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {message}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm text-neutral-600">Full Name</label>
              <input 
                name="name" 
                required 
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" 
                placeholder="Your full name" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Email</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" 
                placeholder="you@example.com" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Subject</label>
              <input 
                name="subject" 
                required 
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" 
                placeholder="How can we help?" 
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600">Message</label>
              <textarea 
                name="message" 
                rows={5} 
                required 
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2" 
                placeholder="Write your message here" 
                disabled={isSubmitting}
              />
            </div>
            <div className="text-xs text-neutral-500">
              By submitting, you agree to our{' '}
              <a className="underline" href="/privacy.html" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a className="underline" href="/terms.html" target="_blank" rel="noreferrer">
                Terms
              </a>
              .
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-neutral-900 text-white py-2.5 elevate w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </Container>
    </section>
  )
}
