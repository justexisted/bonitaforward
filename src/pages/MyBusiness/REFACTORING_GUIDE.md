# MyBusiness.tsx Refactoring Guide

## Current Status

### ✅ Completed
1. **Created folder structure**:
   - `src/pages/MyBusiness/components/` - React components
   - `src/pages/MyBusiness/hooks/` - Custom hooks
   - `src/pages/MyBusiness/utils/` - Utility functions
   - `src/pages/MyBusiness/types.ts` - TypeScript type definitions

2. **Extracted TypeScript Types** (`types.ts`):
   - `BusinessListing` - Main business data type
   - `BusinessApplication` - Application submissions
   - `JobPost` - Job posting data
   - `UserActivity` - User interaction tracking
   - `DashboardTab` - Tab navigation type
   - `ImageUploadProgress` - Upload tracking

3. **Extracted Components**:
   - ✅ `PlanSelector.tsx` - Free vs Featured plan comparison (~200 lines)

### 🔨 Next Steps - Priority Order

#### 1. Extract BusinessListingForm Component (~1,480 lines)
**Location**: Lines 3189-4669 in MyBusiness.tsx

**Dependencies needed**:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { BusinessListing } from '../types'
```

**Component signature**:
```typescript
export function BusinessListingForm({ 
  listing, 
  onSave, 
  onCancel,
  isUpdating = false
}: { 
  listing: BusinessListing | null
  onSave: (data: Partial<BusinessListing>) => void
  onCancel: () => void
  isUpdating?: boolean
})
```

**Includes**:
- Form state management
- Image upload logic
- Business hours editor
- Social media links
- Restaurant tag system
- Coupon management
- Booking system settings
- Google Calendar integration

#### 2. Extract JobPostForm Component (~170 lines)
**Location**: Lines 4683-4849 in MyBusiness.tsx

**Dependencies needed**:
```typescript
import { useState } from 'react'
import type { BusinessListing, JobPost } from '../types'
```

**Component signature**:
```typescript
export function JobPostForm({ 
  listings, 
  editingJob,
  onSave, 
  onCancel 
}: { 
  listings: BusinessListing[]
  editingJob?: JobPost | null
  onSave: (providerId: string, jobData: {
    title: string
    description?: string
    apply_url?: string
    salary_range?: string
  }) => void
  onCancel: () => void 
})
```

#### 3. Extract Additional Components (Optional)
- `BusinessListingCard.tsx` - Individual listing display card
- `ChangeRequestsNotifications.tsx` - Change request notification banners
- `TabNavigation.tsx` - Dashboard tab switcher
- `AnalyticsDashboard.tsx` - Analytics section

### 📦 Recommended Hooks to Create

#### `hooks/useBusinessData.ts`
```typescript
export function useBusinessData(userId: string | undefined) {
  // Fetch and manage all business data (listings, applications, jobs, etc.)
  // Return: { listings, applications, jobPosts, changeRequests, userActivity, loading, error, refetch }
}
```

#### `hooks/useImageUpload.ts`
```typescript
export function useImageUpload(isMember: boolean) {
  // Handle image upload logic with progress tracking
  // Return: { uploadImages, uploadingImages, imageUploadProgress }
}
```

#### `hooks/usePlanChoice.ts`
```typescript
export function usePlanChoice() {
  // Manage user plan selection (free vs featured)
  // Return: { planChoice, selectFree, selectFeatured, loading }
}
```

### 🛠️ Utility Functions to Create

#### `utils/businessValidation.ts`
```typescript
export function validateBusinessData(data: Partial<BusinessListing>): string[]
export function compareBusinessData(original: BusinessListing, updated: Partial<BusinessListing>): Partial<BusinessListing>
```

#### `utils/restaurantTags.ts`
```typescript
export const RESTAURANT_TAG_OPTIONS = {
  cuisine: [...],
  occasion: [...],
  priceRange: [...],
  diningType: [...]
}
```

#### `utils/categories.ts`
```typescript
export const BUSINESS_CATEGORIES = [
  { key: 'real-estate', name: 'Real Estate' },
  { key: 'home-services', name: 'Home Services' },
  // ... etc
]
```

### 📊 Impact

**Current File Size**: ~4,857 lines  
**After extracting Business + Job forms**: ~2,900 lines (40% reduction)  
**After full refactoring**: ~500-800 lines (83% reduction)

### 🚀 Quick Start for Next Developer

To continue the refactoring:

1. **Copy BusinessListingForm** (lines 3189-4669) to `components/BusinessListingForm.tsx`
2. **Add imports** at the top of the new file
3. **Export** the component as `export function BusinessListingForm`
4. **Update MyBusiness.tsx** to import: `import { BusinessListingForm } from './components/BusinessListingForm'`
5. **Test** to ensure it works
6. **Repeat** for JobPostForm

### 📝 Notes

- The BusinessListingForm is particularly complex due to:
  - Multiple form sections (basic info, hours, social, images, etc.)
  - Restaurant-specific tag system
  - Image upload with Supabase Storage
  - Conditional rendering based on free vs featured
  
- Consider breaking BusinessListingForm into even smaller sub-components:
  - `BusinessInfoSection.tsx`
  - `BusinessHoursSection.tsx`
  - `SocialLinksSection.tsx`
  - `ImageUploadSection.tsx`
  - `CouponSection.tsx`
  - `BookingSection.tsx`

This would further improve maintainability!

