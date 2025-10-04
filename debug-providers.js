// Debug script to check provider status in database
// Run this in your browser console on the /admin page or any page with Supabase access

async function debugProviders() {
  console.log('🔍 Debugging provider data...')
  
  try {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available. Make sure you\'re on a page with Supabase initialized.')
      return
    }

    // Fetch all providers (including unpublished)
    const { data: allProviders, error: allError } = await supabase
      .from('providers')
      .select('id, name, category_key, published, badges, tags, images')
      .order('name')

    if (allError) {
      console.error('❌ Error fetching all providers:', allError)
      return
    }

    console.log(`📊 Total providers in database: ${allProviders.length}`)

    // Group by category and published status
    const stats = {}
    allProviders.forEach(provider => {
      const category = provider.category_key || 'unknown'
      const published = provider.published === true
      
      if (!stats[category]) {
        stats[category] = { published: 0, unpublished: 0, total: 0 }
      }
      
      stats[category].total++
      if (published) {
        stats[category].published++
      } else {
        stats[category].unpublished++
      }
    })

    console.log('\n📈 Provider statistics by category:')
    Object.keys(stats).forEach(category => {
      const stat = stats[category]
      console.log(`${category}: ${stat.published} published, ${stat.unpublished} unpublished (${stat.total} total)`)
    })

    // Check for providers with deleted badges
    const deletedProviders = allProviders.filter(p => 
      Array.isArray(p.badges) && p.badges.includes('deleted')
    )
    console.log(`\n🗑️ Providers marked as deleted: ${deletedProviders.length}`)

    // Check image status
    const providersWithImages = allProviders.filter(p => 
      Array.isArray(p.images) && p.images.length > 0 && p.images.some(img => img && img.trim())
    )
    console.log(`🖼️ Providers with images: ${providersWithImages.length}`)

    // Show unpublished providers
    const unpublished = allProviders.filter(p => p.published !== true)
    if (unpublished.length > 0) {
      console.log('\n⚠️ Unpublished providers:')
      unpublished.forEach(p => {
        console.log(`- ${p.name} (${p.category_key}) - Published: ${p.published}`)
      })
    }

    // Show providers with image issues
    const imageIssues = allProviders.filter(p => {
      if (!Array.isArray(p.images) || p.images.length === 0) return false
      return p.images.some(img => !img || img.trim().length === 0)
    })
    if (imageIssues.length > 0) {
      console.log('\n🖼️ Providers with image issues:')
      imageIssues.forEach(p => {
        console.log(`- ${p.name}: ${JSON.stringify(p.images)}`)
      })
    }

    console.log('\n✅ Debug complete! Check the statistics above.')

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug function
debugProviders()
