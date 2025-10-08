// Script to add real Bonita community events to the database
// Run this in your browser console on the admin page

const realBonitaEvents = [
  {
    title: 'Bonita Farmers Market',
    description: 'Weekly farmers market featuring local produce, artisanal goods, and community vendors. Fresh fruits, vegetables, handmade crafts, and local food vendors.',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
    time: '09:00',
    location: 'Bonita Community Park',
    address: '3215 Bonita Rd, Bonita, CA 91902',
    category: 'Community',
    source: 'Local',
    upvotes: 12,
    downvotes: 1,
  },
  {
    title: 'Children\'s Story Time at Bonita-Sunnyside Library',
    description: 'Interactive story time for children ages 3-8 with crafts and activities. This week\'s theme: "Adventures in Nature"',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // In 3 days
    time: '10:30',
    location: 'Bonita-Sunnyside Library',
    address: '4375 Bonita Rd, Bonita, CA 91902',
    category: 'Family',
    source: 'Local',
    upvotes: 8,
    downvotes: 0,
  },
  {
    title: 'Bonita Chamber of Commerce Mixer',
    description: 'Monthly networking event for local business owners and community leaders. Light refreshments provided.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // In 2 weeks
    time: '17:30',
    location: 'Bonita Community Center',
    address: '2900 Bonita Rd, Bonita, CA 91902',
    category: 'Business',
    source: 'Local',
    upvotes: 15,
    downvotes: 2,
  },
  {
    title: 'Community Yoga in Bonita Park',
    description: 'Free outdoor yoga class for all skill levels. Bring your own mat and water bottle. Weather permitting.',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // In 5 days
    time: '08:00',
    location: 'Bonita Community Park',
    address: '3215 Bonita Rd, Bonita, CA 91902',
    category: 'Health & Wellness',
    source: 'Local',
    upvotes: 6,
    downvotes: 1,
  },
  {
    title: 'Food Truck Friday - Bonita Edition',
    description: 'Weekly food truck gathering featuring diverse cuisines from local vendors. Live music and family-friendly atmosphere.',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // In 2 days
    time: '17:00',
    location: 'Bonita Community Center Parking Lot',
    address: '2900 Bonita Rd, Bonita, CA 91902',
    category: 'Food & Entertainment',
    source: 'Local',
    upvotes: 22,
    downvotes: 3,
  },
  {
    title: 'Bonita Community Cleanup Day',
    description: 'Help keep Bonita beautiful! Join neighbors for a community-wide cleanup effort. Gloves and supplies provided.',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // In 10 days
    time: '09:00',
    location: 'Meet at Bonita Community Center',
    address: '2900 Bonita Rd, Bonita, CA 91902',
    category: 'Community Service',
    source: 'Local',
    upvotes: 18,
    downvotes: 1,
  },
  {
    title: 'Senior Bingo Night - Bonita',
    description: 'Weekly bingo for seniors with prizes and refreshments. All ages welcome, but designed for 55+ community members.',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // In 4 days
    time: '19:00',
    location: 'Bonita Community Center',
    address: '2900 Bonita Rd, Bonita, CA 91902',
    category: 'Senior Activities',
    source: 'Local',
    upvotes: 9,
    downvotes: 0,
  },
  {
    title: 'Bonita Craft Fair & Artisan Market',
    description: 'Local artisans showcase handmade goods, jewelry, art, and crafts. Perfect for finding unique gifts and supporting local artists.',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // In 3 weeks
    time: '10:00',
    location: 'Bonita Community Park',
    address: '3215 Bonita Rd, Bonita, CA 91902',
    category: 'Arts & Crafts',
    source: 'Local',
    upvotes: 11,
    downvotes: 2,
  }
]

// Function to add real Bonita events
async function addRealBonitaEvents() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Clear existing events first
    console.log('Clearing existing calendar events...')
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all events
    
    if (deleteError) {
      console.warn('Error clearing existing events:', deleteError)
    }
    
    // Add real Bonita events
    console.log('Adding real Bonita events...')
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(realBonitaEvents)
      .select()
    
    if (error) {
      console.error('Error adding real Bonita events:', error)
    } else {
      console.log('Successfully added real Bonita events:', data)
      alert('Real Bonita events added successfully!')
    }
  } catch (err) {
    console.error('Error:', err)
    alert('Error adding events: ' + err)
  }
}

console.log('Run addRealBonitaEvents() to add real Bonita community events to your calendar')
