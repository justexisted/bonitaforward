# Data Integrity Prevention Guide

**Purpose:** Prevent missing or incomplete data fields from being saved to the database, particularly during user signup and profile updates.

**Last Updated:** 2025-01-XX

---

## The Problem

Repeatedly, we've seen cases where:
1. User enters data during signup (name, email, role)
2. Data is saved to localStorage correctly
3. Data is NOT saved to database (missing fields)
4. Admin panel shows "No name provided" or "Unknown" account type

**Root Cause:** Profile update code in different places (`AuthContext.ensureProfile`, `Onboarding.tsx`, etc.) doesn't consistently include all required fields.

**Example Failures:**
- Onboarding.tsx saved `email`, `role`, `resident_verification` but NOT `name`
- Profile updates missing `role` or `resident_verification` fields
- Account type showing as "unknown" when role is saved as null

---

## Prevention Strategies

### 1. Single Source of Truth for Profile Schema

**Problem:** Different files define profile structure differently, leading to missing fields.

**Solution:**
- Define profile schema in ONE place: `src/types/admin.ts` (ProfileRow)
- Create a shared profile update utility that ALWAYS includes all fields
- Use TypeScript to enforce field presence

**Implementation:**
```typescript
// src/utils/profileUtils.ts
export interface CompleteProfileData {
  email: string
  name: string | null
  role: 'business' | 'community' | null
  is_bonita_resident?: boolean | null
  resident_verification_method?: string | null
  resident_zip_code?: string | null
  resident_verified_at?: string | null
}

export function createProfilePayload(data: Partial<CompleteProfileData>): CompleteProfileData {
  // Always includes ALL fields, even if null
  return {
    email: data.email || '',
    name: data.name || null,
    role: data.role || null,
    is_bonita_resident: data.is_bonita_resident ?? null,
    resident_verification_method: data.resident_verification_method || null,
    resident_zip_code: data.resident_zip_code || null,
    resident_verified_at: data.resident_verified_at || null
  }
}
```

**CRITICAL:** All profile updates MUST use this utility.

---

### 2. Runtime Validation Before Database Save

**Problem:** TypeScript doesn't catch missing fields at runtime if they're optional.

**Solution:**
- Validate profile data before saving to database
- Log warnings when required fields are missing
- Fail loudly during development, gracefully in production

**Implementation:**
```typescript
// src/utils/profileUtils.ts
export function validateProfileBeforeSave(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Required fields (must be present, even if null)
  const requiredFields = ['email', 'name', 'role']
  requiredFields.forEach(field => {
    if (!(field in payload)) {
      errors.push(`Missing required field: ${field}`)
    }
  })
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && errors.length > 0) {
    console.warn('[Profile Validation] Missing fields:', errors)
    console.warn('[Profile Validation] Payload:', payload)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

**Usage:**
```typescript
const payload = createProfilePayload({ email, name, role, ...verification })
const validation = validateProfileBeforeSave(payload)
if (!validation.valid) {
  console.error('[Profile Update] Validation failed:', validation.errors)
  // In production, continue but log error
  // In development, throw error to catch during testing
}
```

---

### 3. Shared Profile Update Utility

**Problem:** Profile updates are scattered across multiple files with inconsistent implementations.

**Solution:**
- Create ONE shared function for profile updates
- All profile updates (signup, onboarding, account settings) use this function
- Function ensures ALL fields are included

**Implementation:**
```typescript
// src/utils/profileUtils.ts
export async function updateUserProfile(
  userId: string,
  data: Partial<CompleteProfileData>,
  source: 'signup' | 'onboarding' | 'account-settings' | 'auth-context'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get complete profile data
    const payload = createProfilePayload(data)
    
    // Validate before save
    const validation = validateProfileBeforeSave(payload)
    if (!validation.valid && process.env.NODE_ENV === 'development') {
      console.error(`[Profile Update from ${source}] Validation failed:`, validation.errors)
    }
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    if (existing) {
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
      
      if (error) {
        console.error(`[Profile Update from ${source}] Error:`, error)
        return { success: false, error: error.message }
      }
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert({ id: userId, ...payload })
      
      if (error) {
        console.error(`[Profile Update from ${source}] Error:`, error)
        return { success: false, error: error.message }
      }
    }
    
    // Log success with source for debugging
    console.log(`[Profile Update from ${source}] Success:`, {
      userId,
      email: payload.email,
      name: payload.name ? 'present' : 'missing',
      role: payload.role || 'null'
    })
    
    return { success: true }
  } catch (error: any) {
    console.error(`[Profile Update from ${source}] Exception:`, error)
    return { success: false, error: error?.message }
  }
}
```

**CRITICAL:** Replace ALL direct profile updates with this utility.

**Files to Update:**
- `src/contexts/AuthContext.tsx` - Replace `ensureProfile()` with `updateUserProfile()`
- `src/pages/Onboarding.tsx` - Replace direct profile update with `updateUserProfile()`
- `src/pages/account/components/AccountSettings.tsx` - Use `updateUserProfile()`

---

### 4. Integration Tests for Signup Flows

**Problem:** Manual testing misses edge cases where data flow breaks.

**Solution:**
- Create integration tests that verify complete signup flow
- Test that name and role are saved correctly in ALL signup paths

**Test Pattern:**
```typescript
// src/__tests__/signup-flow.test.ts
describe('Signup Flow Data Integrity', () => {
  it('should save name and role during SignIn signup', async () => {
    // 1. Simulate signup via SignIn page
    // 2. Check localStorage has name
    // 3. Check database has name after signup completes
    // 4. Verify admin panel shows name
  })
  
  it('should save name and role during Onboarding flow', async () => {
    // 1. Simulate OAuth signup
    // 2. Complete onboarding form
    // 3. Verify name from localStorage is saved to database
  })
  
  it('should preserve name when updating role', async () => {
    // 1. User with name signs up
    // 2. User updates role via Onboarding
    // 3. Verify name is still present after role update
  })
})
```

---

### 5. Code Review Checklist for Profile Updates

**Before merging ANY profile update code:**

- [ ] Uses `updateUserProfile()` utility (not direct Supabase calls)
- [ ] Includes ALL fields (name, email, role, resident verification)
- [ ] Reads from localStorage when available (`bf-pending-profile`)
- [ ] Falls back to auth metadata if localStorage missing
- [ ] Logs source of update for debugging
- [ ] Includes validation before save
- [ ] Tested in both signup flows (SignIn + Onboarding)

**Red Flags:**
- Direct `.from('profiles').update()` or `.insert()` calls
- Missing `name` field in update payload
- Missing `role` field in update payload
- Not reading from localStorage during signup

---

### 6. Database Constraints and Defaults

**Problem:** Database allows null for required fields, making missing data silent.

**Solution (Optional - requires migration):**
- Add database-level constraints for required fields
- Use default values where appropriate
- Add CHECK constraints for role enum values

**Example:**
```sql
-- Ensure role is always 'business' or 'community' (not null)
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('business', 'community') OR role IS NULL);

-- Add NOT NULL constraint for email (already exists)
-- Consider adding NOT NULL for name if required
```

---

### 7. Monitoring and Alerting

**Problem:** Missing data is discovered too late (when admin sees "No name provided").

**Solution:**
- Log profile updates with field completeness
- Alert when profile updates are missing critical fields
- Track completion rate of signup flows

**Implementation:**
```typescript
// In updateUserProfile()
const completeness = {
  hasEmail: !!payload.email,
  hasName: !!payload.name,
  hasRole: !!payload.role !== null
}

if (!completeness.hasName || !completeness.hasRole) {
  // Log warning
  console.warn('[Profile Completeness] Incomplete profile update:', {
    userId,
    source,
    completeness
  })
  
  // In production, send to monitoring service
  // monitor.track('incomplete_profile_update', { userId, source, completeness })
}
```

---

## Immediate Actions

### 1. Create Shared Profile Utility (HIGH PRIORITY)
- [ ] Create `src/utils/profileUtils.ts` with `updateUserProfile()`
- [ ] Create `createProfilePayload()` and `validateProfileBeforeSave()`
- [ ] Update `AuthContext.tsx` to use utility
- [ ] Update `Onboarding.tsx` to use utility
- [ ] Update `AccountSettings.tsx` to use utility

### 2. Add Validation (HIGH PRIORITY)
- [ ] Add runtime validation to `updateUserProfile()`
- [ ] Log warnings in development when fields are missing
- [ ] Test validation catches missing name field

### 3. Update Dependency Tracking Comments (MEDIUM PRIORITY)
- [ ] Add notes about using `updateUserProfile()` utility in all profile update locations
- [ ] Document that ALL profile updates must include name, email, role

### 4. Create Integration Tests (MEDIUM PRIORITY)
- [ ] Test SignIn signup flow saves name
- [ ] Test Onboarding flow saves name from localStorage
- [ ] Test profile updates preserve existing name

---

## Related Documents

- `ASYNC_FLOW_PREVENTION.md` - Prevents async order issues
- `API_CONTRACT_PREVENTION.md` - Prevents API mismatches
- `CASCADING_FAILURES.md` - Prevents cascading breaks
- `DEPENDENCY_TRACKING_PLAN.md` - Documents dependencies

---

## Recent Fixes Using This Guide

- **2025-01-XX**: Onboarding.tsx missing name field
  - **Fix**: Added name reading from localStorage and included in update payload
  - **Prevention**: Created shared `updateUserProfile()` utility to prevent future misses

---

## Notes

- This guide should be referenced whenever ANY profile update code is written
- All profile updates should use the shared utility - NO EXCEPTIONS
- If you find yourself writing `.from('profiles').update()` directly, STOP and use the utility instead

