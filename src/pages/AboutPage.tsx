import Prism from '../components/Prism'

// Container component (copied from App.tsx)
function Container(props: { children: React.ReactNode; className?: string }) {
  return <div className={`container-px mx-auto max-w-6xl ${props.className ?? ''}`}>{props.children}</div>
}

export default function AboutPage() {
  return (
    <section className="relative min-h-screen py-12">
      {/* Prism Background - Top Section */}
      <div className="absolute top-0 left-0 right-0 h-96 z-0" style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}>
        <Prism
          height={6}
          baseWidth={18}
          animationType="rotate"
          glow={0.6}
          noise={0}
          transparent={true}
          scale={1.8}
          hueShift={0.3}
          colorFrequency={0.6}
          timeScale={0.08}
          bloom={0.4}
          suspendWhenOffscreen={true}
        />
      </div>

      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50/20 via-white/10 to-white/5 z-0"></div>

      {/* Content */}
      <div className="relative z-10" style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}>
        <Container>
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-black mb-6">
              For Bonita, By Bonita
            </h1>
            <p className="text-xl md:text-2xl text-black/90 mb-8 max-w-4xl mx-auto">
              Connecting Our Community. Supporting Our Businesses.
            </p>
            <p className="text-lg text-black/80 max-w-3xl mx-auto">
              Your Digital Main Street
            </p>
          </div>

          {/* Story Section */}
          <div className="mb-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/20">
              <h2 className="text-3xl font-bold text-black mb-6 text-center">Our Story</h2>
              <p className="text-lg text-black/90 leading-relaxed text-center max-w-4xl mx-auto">
                We were talking about how much we love our community, but worried that some of our favorite local gems were struggling to be seen online. We knew there had to be a better way to connect residents with the amazing businesses right in our backyard.
              </p>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-black mb-4">Our Mission</h3>
              <p className="text-black/90 leading-relaxed">
                Our mission is to empower Bonita's local businesses by providing a digital platform that fosters community connection, drives economic growth, and celebrates the unique character of our town.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-black mb-4">Our Vision</h3>
              <p className="text-black/90 leading-relaxed">
                We envision a thriving, interconnected Bonita where every local business has the tools to succeed, and every resident feels a strong sense of pride and connection to their community.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-black mb-8 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Community First */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-black mb-3">Community First</h3>
                <p className="text-black/80 text-sm">
                  Every decision we make prioritizes the well-being and growth of our local community.
                </p>
              </div>

              {/* Integrity */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">⚖️</div>
                <h3 className="text-xl font-bold text-black mb-3">Integrity</h3>
                <p className="text-black/80 text-sm">
                  We operate with honesty, transparency, and ethical practices in everything we do.
                </p>
              </div>

              {/* Collaboration */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="text-xl font-bold text-black mb-3">Collaboration</h3>
                <p className="text-black/80 text-sm">
                  We believe in the power of working together to achieve common goals.
                </p>
              </div>

              {/* Innovation */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-black mb-3">Innovation</h3>
                <p className="text-black/80 text-sm">
                  We continuously seek creative solutions to support our local businesses.
                </p>
              </div>

              {/* Local Pride */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-xl font-bold text-black mb-3">Local Pride</h3>
                <p className="text-black/80 text-sm">
                  We celebrate and promote the unique character and businesses of Bonita.
                </p>
              </div>

              {/* Growth */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-xl font-bold text-black mb-3">Growth</h3>
                <p className="text-black/80 text-sm">
                  We're committed to fostering sustainable economic growth for our community.
                </p>
              </div>
            </div>
          </div>

          {/* Meet the Team Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-black mb-8 text-center">Meet the Team</h2>
            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-8">

              {/* Team Member 1 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">AC</span>
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Agustin Chavez</h3>
                <p className="text-black/80 text-sm mb-3">Founder</p>
                <p className="text-black/70 text-sm">
                  "I've seen too many amazing shops struggle with visibility while big chains thrive."
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/20">
              <h2 className="text-3xl font-bold text-black mb-4">Join Our Mission</h2>
              <p className="text-lg text-black/90 mb-6 max-w-2xl mx-auto">
                Be part of building a stronger, more connected Bonita community. Whether you're a business owner or a resident, together we can make our town thrive.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/business"
                  className="bg-white text-purple-900 px-8 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
                >
                  Add Your Business
                </a>
                <a
                  href="/signin?mode=signup"
                  className="border-2 border-black text-black px-8 py-3 rounded-full font-semibold hover:bg-black/10 transition-colors"
                >
                  Join Community
                </a>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </section>
  )
}
