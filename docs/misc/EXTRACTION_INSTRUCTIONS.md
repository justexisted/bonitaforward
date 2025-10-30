# Quick Extraction Instructions

## 🎯 Goal
Reduce `MyBusiness.tsx` from ~4,900 lines to ~3,100 lines by extracting two large components.

## 📋 Step-by-Step Guide

### Component 1: BusinessListingForm (~1,500 lines)

1. **Open `src/pages/MyBusiness.tsx`**
2. **Search for**: `START: BusinessListingForm` (around line 3173)
3. **Select** from that line down to `END: BusinessListingForm` (around line 4676)
4. **Copy** the selected text
5. **Create new file**: `src/pages/MyBusiness/components/BusinessListingForm.tsx`
6. **Paste** the copied content
7. **Add imports** at the very top:
   ```typescript
   import { useState, useEffect } from 'react'
   import { supabase } from '../../../lib/supabase'
   import type { BusinessListing, ImageUploadProgress } from '../types'
   ```
8. **Change line** that says `function BusinessListingForm` to `export function BusinessListingForm`
9. **Save** the new file

10. **Go back to `MyBusiness.tsx`**
11. **Delete** everything from `START: BusinessListingForm` to `END: BusinessListingForm` markers
12. **Add import** near the top (around line 50):
    ```typescript
    import { BusinessListingForm } from './MyBusiness/components/BusinessListingForm'
    ```
13. **Save** MyBusiness.tsx

---

### Component 2: JobPostForm (~240 lines)

1. **In `src/pages/MyBusiness.tsx`**
2. **Search for**: `START: JobPostForm` (around line 4680, or ~2,950 if you already extracted BusinessListingForm)
3. **Select** from that line down to `END: JobPostForm` (around line 4928)
4. **Copy** the selected text
5. **Create new file**: `src/pages/MyBusiness/components/JobPostForm.tsx`
6. **Paste** the copied content
7. **Add imports** at the very top:
   ```typescript
   import { useState } from 'react'
   import type { BusinessListing, JobPost } from '../types'
   ```
8. **Change line** that says `function JobPostForm` to `export function JobPostForm`
9. **Save** the new file

10. **Go back to `MyBusiness.tsx`**
11. **Delete** everything from `START: JobPostForm` to `END: JobPostForm` markers
12. **Add import** near the top (after BusinessListingForm import):
    ```typescript
    import { JobPostForm } from './MyBusiness/components/JobPostForm'
    ```
13. **Save** MyBusiness.tsx

---

## ✅ Verification

After extraction, your file structure should look like:
```
src/pages/
├── MyBusiness.tsx (~3,100 lines - 37% smaller!)
└── MyBusiness/
    ├── types.ts
    ├── components/
    │   ├── index.ts
    │   ├── PlanSelector.tsx
    │   ├── BusinessListingForm.tsx (NEW!)
    │   └── JobPostForm.tsx (NEW!)
    ├── hooks/
    └── utils/
```

## 🧪 Testing

1. Start your dev server
2. Navigate to `/my-business`
3. Test:
   - ✅ Creating a new business listing
   - ✅ Editing an existing listing
   - ✅ Creating a job post
   - ✅ Image uploads

If anything doesn't work, check:
- Import paths are correct (especially `../../../` vs `../../`)
- All functions are exported properly
- No duplicate imports in MyBusiness.tsx

## 🎉 Done!

You've successfully refactored MyBusiness.tsx! The file is now 37% smaller and much more maintainable.

Consider next steps:
- Extract `useBusinessData` hook
- Extract `useImageUpload` hook
- Break BusinessListingForm into smaller sub-components

