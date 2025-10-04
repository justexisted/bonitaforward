// Debug script specifically for home-services and image issues
// Run this in your browser console on any page with Supabase access

async function debugSpecificIssues() {
  console.log('🔍 Debugging specific issues...')
  
  try {
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available')
      return
    }

    // 1. Check home-services providers specifically
    console.log('\n🏠 Checking home-services providers...')
    const { data: homeServicesProviders, error: homeError } = await supabase
      .from('providers')
      .select('id, name, category_key, published, badges, images')
      .eq('category_key', 'home-services')
      .order('name')

    if (homeError) {
      console.error('❌ Error fetching home-services providers:', homeError)
    } else {
      console.log(`📊 Home-services providers found: ${homeServicesProviders.length}`)
      homeServicesProviders.forEach(p => {
        console.log(`- ${p.name} (Published: ${p.published}, Images: ${p.images?.length || 0})`)
      })
    }

    // 2. Check published home-services providers
    console.log('\n✅ Checking published home-services providers...')
    const { data: publishedHomeProviders, error: publishedHomeError } = await supabase
      .from('providers')
      .select('id, name, category_key, published, badges, images')
      .eq('category_key', 'home-services')
      .eq('published', true)
      .order('name')

    if (publishedHomeError) {
      console.error('❌ Error fetching published home-services providers:', publishedHomeError)
    } else {
      console.log(`📊 Published home-services providers: ${publishedHomeProviders.length}`)
      publishedHomeProviders.forEach(p => {
        console.log(`- ${p.name} (Images: ${p.images?.length || 0})`)
      })
    }

    // 3. Check all providers with images
    console.log('\n🖼️ Checking providers with images...')
    const { data: providersWithImages, error: imagesError } = await supabase
      .from('providers')
      .select('id, name, category_key, published, images')
      .not('images', 'is', null)
      .order('category_key, name')

    if (imagesError) {
      console.error('❌ Error fetching providers with images:', imagesError)
    } else {
      console.log(`📊 Providers with images: ${providersWithImages.length}`)
      
      // Group by category
      const byCategory = {}
      providersWithImages.forEach(p => {
        if (!byCategory[p.category_key]) byCategory[p.category_key] = []
        byCategory[p.category_key].push(p)
      })
      
      Object.keys(byCategory).forEach(category => {
        console.log(`\n${category}: ${byCategory[category].length} providers`)
        byCategory[category].forEach(p => {
          const imageCount = Array.isArray(p.images) ? p.images.length : 0
          console.log(`  - ${p.name} (${imageCount} images, Published: ${p.published})`)
          if (Array.isArray(p.images) && p.images.length > 0) {
            console.log(`    Images: ${p.images.slice(0, 2).join(', ')}${p.images.length > 2 ? '...' : ''}`)
          }
        })
      })
    }

    // 4. Test a specific image URL
    if (providersWithImages && providersWithImages.length > 0) {
      const firstProvider = providersWithImages[0]
      if (Array.isArray(firstProvider.images) && firstProvider.images.length > 0) {
        console.log(`\n🧪 Testing image URL for ${firstProvider.name}:`)
        console.log(`URL: ${firstProvider.images[0]}`)
        
        // Test if the image loads
        const img = new Image()
        img.onload = () => console.log('✅ Image loaded successfully')
        img.onerror = () => console.log('❌ Image failed to load')
        img.src = firstProvider.images[0]
      }
    }

    // 5. Check for any providers with empty or invalid category_key
    console.log('\n🔍 Checking for providers with invalid category_key...')
    const { data: invalidCategoryProviders, error: invalidError } = await supabase
      .from('providers')
      .select('id, name, category_key, published')
      .or('category_key.is.null,category_key.eq.')
      .order('name')

    if (invalidError) {
      console.error('❌ Error checking invalid category providers:', invalidError)
    } else if (invalidCategoryProviders.length > 0) {
      console.log(`⚠️ Found ${invalidCategoryProviders.length} providers with invalid category_key:`)
      invalidCategoryProviders.forEach(p => {
        console.log(`- ${p.name} (category_key: "${p.category_key}", published: ${p.published})`)
      })
    } else {
      console.log('✅ No providers with invalid category_key found')
    }

    console.log('\n✅ Debug complete!')

  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// Run the debug function
debugSpecificIssues()
