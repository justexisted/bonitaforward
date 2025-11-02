# Automated Breaking Change Checks

**Purpose:** Automatically detect common breaking change patterns before they cause cascading failures.

**Last Updated:** 2025-01-XX

---

## Quick Start

Run the breaking change checker:

```bash
npm run check:breaking
```

This will check for:
- ✅ Duplicate type definitions
- ✅ Direct Supabase profile updates (should use profileUtils)
- ✅ localStorage key mismatches
- ✅ Missing dependency tracking comments
- ✅ API response format inconsistencies
- ✅ Auth check order issues

---

## What Gets Checked

### 1. Duplicate Type Definitions ⭐ CRITICAL

**Problem:** Defining the same type in multiple places causes inconsistencies.

**Example Failure:**
```typescript
// src/types/admin.ts
export type ProfileRow = { id: string; email: string; name: string }

// src/hooks/useAdminDataLoader.ts
type ProfileRow = { id: string; email: string }  // ❌ Missing name field!
```

**Check:** Finds duplicate definitions of `ProfileRow`, `AdminStatus`, `CustomerUser` outside their expected locations.

**Expected Locations:**
- `ProfileRow` → `src/types/admin.ts`
- `AdminStatus` → `src/hooks/useAdminVerification.ts`
- `CustomerUser` → `src/utils/adminHelpers.ts`

---

### 2. Direct Profile Updates ⭐ CRITICAL

**Problem:** Direct Supabase calls omit fields, causing incomplete profiles.

**Example Failure:**
```typescript
// ❌ WRONG: Direct update omits name
await supabase.from('profiles').update({ email, role })

// ✅ CORRECT: Use profileUtils
await updateUserProfile(userId, { email, name, role }, 'onboarding')
```

**Check:** Finds `.from('profiles').update()` or `.insert()` calls outside `profileUtils.ts`.

**Fix:** Always use `updateUserProfile()` from `src/utils/profileUtils.ts`.

---

### 3. localStorage Key Mismatches

**Problem:** Wrong localStorage keys break signup flows.

**Example Failure:**
```typescript
// ❌ WRONG: Wrong key name
localStorage.getItem('bf-pending-data')  // Should be 'bf-pending-profile'

// ✅ CORRECT: Use expected keys
localStorage.getItem('bf-pending-profile')
localStorage.getItem('bf-return-url')
```

**Check:** Warns about unexpected localStorage keys starting with `bf-`.

**Expected Keys:**
- `bf-pending-profile` - Signup data
- `bf-return-url` - Redirect URL after onboarding

---

### 4. Missing Dependency Tracking

**Problem:** Critical files without dependency tracking cause cascading failures.

**Check:** Verifies that critical files have `DEPENDENCY TRACKING` comments.

**Critical Files Checked:**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAdminDataLoader.ts`
- `src/hooks/useAdminVerification.ts`
- `src/utils/profileUtils.ts`
- `src/pages/Onboarding.tsx`
- `src/utils/adminUserUtils.ts`
- `netlify/functions/admin-list-profiles.ts`
- `netlify/functions/admin-delete-user.ts`
- `netlify/functions/utils/response.ts`
- `netlify/functions/utils/userDeletion.ts`

**Fix:** Add a `DEPENDENCY TRACKING` comment at the top of the file (see template in other critical files).

---

### 5. API Response Format Inconsistencies

**Problem:** Netlify functions returning inconsistent response formats.

**Example Failure:**
```typescript
// ❌ WRONG: Direct return without standardized format
return { statusCode: 200, body: JSON.stringify({ data: profiles }) }

// ✅ CORRECT: Use standardized utilities
return successResponse({ data: profiles })
```

**Check:** Warns if Netlify functions return responses directly instead of using `successResponse()` or `errorResponse()`.

**Fix:** Always use `successResponse()` or `errorResponse()` from `netlify/functions/utils/response.ts`.

---

### 6. Auth Check Order Issues ⭐ CRITICAL

**Problem:** Checking `!auth.email` before `auth.loading` causes logout during navigation.

**Example Failure:**
```typescript
// ❌ WRONG: Email check before loading check
if (!auth.email) {
  setAdminStatus({ isAdmin: false })  // Logs out during navigation!
  return
}
if (auth.loading) {
  return  // Too late!
}

// ✅ CORRECT: Loading check first
if (auth.loading) {
  return  // Preserve current state
}
if (!auth.email) {
  // ... handle missing email
}
```

**Check:** Finds instances where `!auth.email` is checked before `auth.loading` in admin verification code.

**Fix:** Always check `auth.loading` FIRST, then `auth.email`.

---

## Integration

### Pre-Commit Hook (Recommended)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npm run check:breaking
if [ $? -ne 0 ]; then
  echo "❌ Breaking change checks failed. Fix errors before committing."
  exit 1
fi
```

Or use the npm script:

```bash
npm run precommit  # Runs check:breaking + lint
```

### CI/CD Integration

Add to `netlify.toml` or CI config:

```toml
[build]
  command = "npm run check:breaking && npm run build"
```

Or in GitHub Actions:

```yaml
- name: Check for breaking changes
  run: npm run check:breaking
```

---

## Rule Reference

| Rule | Severity | Description |
|------|----------|-------------|
| `DUPLICATE_TYPE` | Error | Type defined in multiple places |
| `DIRECT_PROFILE_UPDATE` | Error | Direct Supabase profile update (use profileUtils) |
| `MISSING_DEPENDENCY_TRACKING` | Error | Critical file missing dependency tracking |
| `AUTH_CHECK_ORDER` | Error | Wrong order for auth state checks |
| `LOCALSTORAGE_KEY` | Warning | Unexpected localStorage key |
| `API_RESPONSE_FORMAT` | Warning | Netlify function not using standardized response |

---

## Adding New Checks

To add a new check, edit `scripts/check-breaking-changes.ts`:

```typescript
function checkNewPattern(file: string, content: string): void {
  // Your check logic
  if (patternFound) {
    results.push({
      file,
      line: lineNumber,
      rule: 'NEW_RULE_NAME',
      severity: 'error', // or 'warning'
      message: 'Description of the issue'
    })
  }
}

// Add to runChecks():
checkNewPattern(file, content)
```

---

## Exclusions

The checker automatically excludes:
- Files in `node_modules/`
- Files in `dist/`
- Test files (`.test.ts`, `.spec.ts`)
- `profileUtils.ts` itself (for direct profile update check)

---

## Troubleshooting

**Check is too strict:**
- Some warnings can be ignored (marked as `warning` not `error`)
- Fix the underlying issue instead of disabling checks

**Check is missing something:**
- Add a new check function to `check-breaking-changes.ts`
- Document the new pattern in this guide

**Check is slow:**
- It scans all TypeScript files in `src/` and `netlify/functions/`
- For faster checks, you can modify the script to check only changed files (use git diff)

---

## Related Guides

- `CASCADING_FAILURES.md` - Why these patterns cause failures
- `DATA_INTEGRITY_PREVENTION.md` - Preventing missing fields
- `ASYNC_FLOW_PREVENTION.md` - Preventing async order issues
- `API_CONTRACT_PREVENTION.md` - Preventing API mismatches
- `DEPENDENCY_TRACKING_PLAN.md` - Dependency tracking strategy

---

## Best Practices

1. **Run before committing:**
   ```bash
   npm run check:breaking
   ```

2. **Run in CI/CD:**
   - Add to build pipeline
   - Fail builds on errors
   - Warn on warnings

3. **Fix errors immediately:**
   - Don't ignore errors
   - Don't disable checks
   - Fix the root cause

4. **Review warnings:**
   - Warnings are suggestions
   - Review and decide if action is needed
   - Document why warning is acceptable if ignored

---

## Future Enhancements

Potential additions:
- [ ] Check for unused imports/variables
- [ ] Check for missing error handling
- [ ] Check for hardcoded environment variables
- [ ] Check for RLS policy consistency
- [ ] Check for TypeScript strict mode violations
- [ ] Check for React hook dependency issues
- [ ] Integration with git hooks (husky)
- [ ] Check only changed files (faster)
- [ ] Generate reports in JSON format

---

## Summary

The automated breaking change checker helps prevent cascading failures by:
- ✅ Catching duplicate type definitions early
- ✅ Enforcing use of profileUtils for profile updates
- ✅ Verifying dependency tracking in critical files
- ✅ Detecting auth check order issues
- ✅ Warning about API response format inconsistencies

**Run it:** `npm run check:breaking`  
**Use it:** Before every commit  
**Fix it:** Don't ignore errors, fix the root cause

