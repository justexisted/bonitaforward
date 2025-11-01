# Bonita Resident Verification - Phase 1 Implementation

## Overview
Phase 1 implements basic Bonita resident verification via ZIP code validation and self-declaration. This provides a quick way to verify users are Bonita residents without requiring complex document verification.

## What Was Implemented

### 1. Database Migration
**File:** `ops/migrations/add-resident-verification.sql`

Added 4 new columns to `profiles` table:
- `is_bonita_resident` (BOOLEAN) - Flag indicating verified resident status
- `resident_verification_method` (TEXT) - Method used: 'self-declared', 'zip-verified', etc.
- `resident_zip_code` (TEXT) - ZIP code provided by user (first 5 digits stored)
- `resident_verified_at` (TIMESTAMPTZ) - When verification was completed

**To Apply:**
Run the SQL migration in Supabase SQL Editor:
```sql
-- See ops/migrations/add-resident-verification.sql for full migration
```

### 2. Verification Utility Functions
**File:** `src/utils/residentVerification.ts`

Created utility functions for resident verification:
- `isValidBonitaZip(zipCode)` - Validates if ZIP code is a Bonita ZIP (91902, 91908, 91909)
- `verifyByZipCode(zipCode)` - Verifies via ZIP code validation
- `verifyBySelfDeclaration(zipCode?)` - Verifies via self-declaration (with optional ZIP)
- `getVerificationMethodLabel(method)` - Gets display label for verification method

### 3. Profile Type Updates
**File:** `src/types/index.ts`

Updated `Profile` type to include:
```typescript
is_bonita_resident?: boolean | null
resident_verification_method?: 'self-declared' | 'zip-verified' | 'address-verified' | 'document-verified' | 'admin-verified' | null
resident_zip_code?: string | null
resident_verified_at?: string | null
```

### 4. Onboarding Page
**File:** `src/pages/Onboarding.tsx`

Added resident verification section:
- Checkbox: "I am a Bonita resident"
- Optional ZIP code field (only shown when checkbox is checked)
- Validates ZIP code if provided (91902, 91908, 91909)
- Saves verification data to profile

### 5. SignIn Signup Flow
**File:** `src/pages/SignIn.tsx`

Added resident verification to signup form:
- Same checkbox and ZIP code field as onboarding
- Stores verification data in `bf-pending-profile` localStorage
- Gets picked up by `ensureProfile` function when profile is created

### 6. Profile Creation Hook
**File:** `src/contexts/AuthContext.tsx`

Updated `ensureProfile` function to:
- Read resident verification data from `bf-pending-profile` localStorage
- Save verification fields when creating/updating profile
- Supports both signup and onboarding flows

## How It Works

### Verification Flow

1. **User Signs Up:**
   - User fills out signup form
   - Optionally checks "I am a Bonita resident"
   - Optionally enters ZIP code
   - Data stored in localStorage

2. **Verification Logic:**
   - If ZIP code provided and valid → `zip-verified`
   - If ZIP code provided but invalid → `self-declared` (still verified)
   - If no ZIP code but checkbox checked → `self-declared`

3. **Profile Creation:**
   - When profile is created, verification data is saved
   - `is_bonita_resident = true` if checkbox was checked
   - `resident_verification_method` set to appropriate method
   - `resident_zip_code` stored (first 5 digits)
   - `resident_verified_at` timestamp recorded

### Valid Bonita ZIP Codes
- 91902 (Bonita)
- 91908 (Bonita Long Canyon)
- 91909 (Bonita Vista)

## Usage Examples

### Check if user is verified resident
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_bonita_resident, resident_verification_method')
  .eq('id', userId)
  .single()

if (profile?.is_bonita_resident) {
  // User is verified Bonita resident
  const method = profile.resident_verification_method
  // method will be 'zip-verified' or 'self-declared'
}
```

### Verify ZIP code in code
```typescript
import { isValidBonitaZip } from '@/utils/residentVerification'

if (isValidBonitaZip('91902')) {
  // Valid Bonita ZIP
}
```

## Next Steps (Phase 2)

When ready to enhance:
1. **Address Validation API** - Verify full address via SmartyStreets/USPS
2. **Document Upload** - Allow users to upload utility bills/ID
3. **Admin Review Interface** - Review document uploads manually
4. **Verification Levels** - Bronze/Silver/Gold tiers based on verification method

## Testing

1. **Test ZIP Code Validation:**
   - Enter 91902 → Should verify as `zip-verified`
   - Enter 92014 (Chula Vista) → Should fall back to `self-declared`
   - Leave ZIP empty but check box → Should be `self-declared`

2. **Test Profile Creation:**
   - Sign up with resident checkbox checked
   - Check Supabase `profiles` table for verification fields
   - Verify fields are saved correctly

3. **Test Both Flows:**
   - Test signup flow (SignIn page)
   - Test onboarding flow (Onboarding page)
   - Both should save verification data

## Database Migration

**IMPORTANT:** Run the migration before deploying:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run `ops/migrations/add-resident-verification.sql`

This will add the required columns to the `profiles` table.

