# Business Hours - Modern Table Format

## Issue
On the provider detail page (`/provider/{slug}`), the business hours display had several issues:
- Days were displayed in random order (based on object key order)
- Layout had too much spacing between days
- No modern table/card format

## Solution Applied

### New Modern Table Format
Replaced the old grid layout with a modern, clean table-style display:

**Visual Design:**
- ✅ Clean white card with border
- ✅ Each day is a row with subtle divider lines
- ✅ Hover effect on each row for better interactivity
- ✅ Consistent padding and spacing
- ✅ Monospace font for hours (professional look)

**Day Ordering:**
- ✅ Days now display in proper calendar order:
  - Monday
  - Tuesday
  - Wednesday
  - Thursday
  - Friday
  - Saturday
  - Sunday
- ✅ Only shows days that have hours set (filters out empty days)

**Layout:**
- ✅ Single column format (no more split columns)
- ✅ Each day takes full width
- ✅ Day name on left, hours on right
- ✅ Clean spacing between rows
- ✅ Border between days (except last one)

### Technical Changes

**Before:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
  {Object.entries(provider.business_hours).map(([day, hours]) => (
    <div key={day} className="flex justify-between items-center py-1">
      <span className="font-medium text-neutral-700 capitalize">{day}</span>
      <span className="text-neutral-600">{hours}</span>
    </div>
  ))}
</div>
```

**After:**
```jsx
<div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
  {[
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]
    .filter(({ key }) => provider.business_hours?.[key])
    .map(({ key, label }, index, array) => (
      <div 
        key={key} 
        className={`flex justify-between items-center px-4 py-3 ${
          index !== array.length - 1 ? 'border-b border-neutral-100' : ''
        } hover:bg-neutral-50 transition-colors`}
      >
        <span className="font-medium text-neutral-800">{label}</span>
        <span className="text-neutral-600 font-mono text-sm">{provider.business_hours?.[key]}</span>
      </div>
    ))}
</div>
```

## Files Modified
- `src/pages/ProviderPage.tsx` - Updated business hours display format

## Visual Improvements

### Old Format Issues:
- ❌ Days in random order
- ❌ Two columns on desktop (days too far apart)
- ❌ Minimal styling
- ❌ No visual hierarchy

### New Format Benefits:
- ✅ Days in calendar order (Mon-Sun)
- ✅ Single, clean table layout
- ✅ Professional card styling with borders
- ✅ Hover effects for interactivity
- ✅ Better visual hierarchy
- ✅ Monospace font for hours (easier to read/scan)
- ✅ Responsive on mobile
- ✅ Only shows days that are set

## Testing
Visit any provider page with business hours set (e.g., `/provider/thai-restaurant`) and verify:
- [ ] Days appear in Monday-Sunday order
- [ ] Days are close together in a single table
- [ ] Hover effect works on each row
- [ ] Hours display in monospace font
- [ ] Mobile responsive (single column)
- [ ] Border between days (except last)
- [ ] Clean, modern appearance

## Example Display
```
Business Hours
┌─────────────────────────────────┐
│ Monday      9:00 AM - 5:00 PM   │
├─────────────────────────────────┤
│ Tuesday     9:00 AM - 5:00 PM   │
├─────────────────────────────────┤
│ Wednesday   9:00 AM - 5:00 PM   │
├─────────────────────────────────┤
│ Thursday    9:00 AM - 5:00 PM   │
├─────────────────────────────────┤
│ Friday      9:00 AM - 5:00 PM   │
├─────────────────────────────────┤
│ Saturday    10:00 AM - 4:00 PM  │
├─────────────────────────────────┤
│ Sunday      Closed              │
└─────────────────────────────────┘
```

