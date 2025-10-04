// Quick database check script
// Run this in your browser console on any page with Supabase access

async function quickCheck() {
  console.log('🔍 Quick Database Check...')
  
  try {
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available')
      return
    }

    // Check home-services specifically
    const { data: homeServices, error: homeError } = await supabase
      .from('providers')
      .select('id, name, category_key, published, images, badges')
      .eq('category_key', 'home-services')

    if (homeError) {
      console.error('❌ Error fetching home-services:', homeError)
      return
    }

    console.log(`🏠 Home-services providers: ${homeServices.length}`)
    
    const published = homeServices.filter(p => p.published === true || p.published === 'true' || p.published === 1)
    const unpublished = homeServices.filter(p => !(p.published === true || p.published === 'true' || p.published === 1))
    
    console.log(`✅ Published: ${published.length}`)
    console.log(`❌ Unpublished: ${unpublished.length}`)
    
    if (published.length > 0) {
      console.log('\n📋 Published home-services providers:')
      published.forEach(p => {
        console.log(`- ${p.name} (Images: ${p.images?.length || 0})`)
      })
    }
    
    if (unpublished.length > 0) {
      console.log('\n⚠️ Unpublished home-services providers:')
      unpublished.forEach(p => {
        console.log(`- ${p.name} (Published: ${p.published})`)
      })
    }

    // Check images for a few providers
    const providersWithImages = homeServices.filter(p => p.images && p.images.length > 0)
    if (providersWithImages.length > 0) {
      console.log('\n🖼️ Testing image URLs...')
      for (const provider of providersWithImages.slice(0, 3)) {
        console.log(`\n${provider.name}:`)
        for (const imgUrl of provider.images.slice(0, 2)) {
          console.log(`  Testing: ${imgUrl}`)
          const img = new Image()
          img.onload = () => console.log(`  ✅ Loaded successfully`)
          img.onerror = () => console.log(`  ❌ Failed to load`)
          img.src = imgUrl
        }
      }
    }

    // Check other categories
    const categories = ['real-estate', 'professional-services', 'restaurants-cafes', 'health-wellness']
    for (const category of categories) {
      const { data: catData, error: catError } = await supabase
        .from('providers')
        .select('id, name, published')
        .eq('category_key', category)
      
      if (!catError && catData) {
        const catPublished = catData.filter(p => p.published === true || p.published === 'true' || p.published === 1)
        console.log(`${category}: ${catPublished.length} published out of ${catData.length} total`)
      }
    }

  } catch (error) {
    console.error('❌ Quick check failed:', error)
  }
}

quickCheck()
