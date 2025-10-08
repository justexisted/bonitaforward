// Simple script to add sample calendar events
// Run this in the browser console on your admin page

const sampleEvents = [
  {
    title: 'Bonita Farmers Market',
    description: 'Weekly farmers market featuring local produce, artisanal goods, and community vendors.',
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
    title: 'Children\'s Story Time',
    description: 'Interactive story time for children ages 3-8 with crafts and activities.',
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
    title: 'Bonita Chamber Mixer',
    description: 'Monthly networking event for local business owners and community leaders.',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // In 2 weeks
    time: '17:30',
    location: 'Bonita Community Center',
    address: '2900 Bonita Rd, Bonita, CA 91902',
    category: 'Business',
    source: 'Local',
    upvotes: 15,
    downvotes: 2,
  }
]

// Function to add sample events
async function addSampleEvents() {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { data, error } = await supabase
      .from('calendar_events')
      .insert(sampleEvents)
      .select()
    
    if (error) {
      console.error('Error adding sample events:', error)
    } else {
      console.log('Sample events added successfully:', data)
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

console.log('Run addSampleEvents() to add sample calendar events')
