// Debug script for restaurants-cafes images
// Run this in browser console on the restaurants page

console.log('=== RESTAURANTS DEBUG ===');

// Method 1: Check localStorage/sessionStorage
const stored = localStorage.getItem('bf-providers');
if (stored) {
  try {
    const data = JSON.parse(stored);
    console.log('Stored restaurants:', data['restaurants-cafes']?.slice(0, 3).map(p => ({
      name: p.name,
      images: p.images,
      hasImages: !!p.images && p.images.length > 0
    })));
  } catch (e) {
    console.log('No stored data');
  }
}

// Method 2: Check DOM elements
const imageElements = document.querySelectorAll('img[alt*="business photo"]');
console.log('Image elements found:', imageElements.length);
imageElements.forEach((img, i) => {
  if (i < 3) {
    console.log(`Image ${i}:`, {
      src: img.src,
      alt: img.alt,
      displayed: img.style.display !== 'none',
      naturalWidth: img.naturalWidth
    });
  }
});

// Method 3: Check placeholder elements
const placeholders = document.querySelectorAll('[class*="Photo coming soon"]');
console.log('Placeholder elements:', placeholders.length);

console.log('=== END DEBUG ===');

