import { Link } from 'react-router-dom'

export default function ContactPageSimple() {
  return (
    <section className="py-8">
      <div className="container-px mx-auto max-w-3xl">
        <div className="rounded-2xl border border-neutral-100 p-5 bg-white">
          <h1 className="text-xl font-semibold tracking-tight">Contact Us</h1>
          <p className="mt-2 text-sm text-neutral-600">For any questions, reach us at bonitaforward@gmail.com.</p>
          <div className="mt-4 text-xs text-neutral-500">
            <Link to="/privacy.html" className="underline">Privacy Policy</Link>
            <span className="mx-2">·</span>
            <Link to="/terms.html" className="underline">Terms</Link>
          </div>
        </div>
      </div>
    </section>
  )
}


