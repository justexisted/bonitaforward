import { Link } from 'react-router-dom'

/**
 * Confetti component for celebration animation
 * 
 * Creates a simple CSS confetti effect using pseudo-random gradients
 * with 40 animated pieces that fall from the top of the screen
 */
function Confetti() {
  // simple CSS confetti using pseudo-random gradients
  const pieces = Array.from({ length: 40 })
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        {pieces.map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-3 rounded-sm opacity-80"
            style={{
              left: Math.random() * 100 + '%',
              top: '-10px',
              background: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `confetti-fall ${2000 + Math.random() * 1200}ms ease-in forwards`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Thank You page component
 * 
 * Displays a success message with confetti animation when users
 * successfully submit a request to be featured. Includes:
 * - Celebration confetti animation
 * - Success message
 * - Navigation back to home page
 * 
 * Used after business application submissions and feature requests
 */
export default function ThankYouPage() {
  return (
    <section className="py-6 md:py-8">
      <div className="container-px mx-auto max-w-6xl">
        <div className="relative rounded-2xl border border-neutral-100 p-8 bg-white text-center elevate form-fade">
          <Confetti />
          <h1 className="text-2xl font-semibold tracking-tight">Thanks! 🎉</h1>
          <p className="mt-2 text-neutral-600">Your request to be featured was successfully submitted.</p>
          <div className="mt-5">
            <Link to="/" className="btn btn-primary">Back to Home</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
