# Automated Checks for Supabase Query Migration

**Date:** 2025-01-XX  
**Status:** Automated Verification Available

---

## ✅ What Can Be Automated

### 1. Code Structure Verification

**Checks:**
- ✅ Query utility is imported correctly
- ✅ No direct `supabase.from()` table queries in migrated files
- ✅ Query utility methods are used correctly
- ✅ Log prefixes are present in query calls
- ✅ Error handling patterns are maintained

**Script:** `scripts/verify-query-migration.ts`

**Run:**
```bash
npx tsx scripts/verify-query-migration.ts
```

**Output:**
- ✅ Pass/Fail for each migrated file
- ⚠️  Warnings for potential issues
- ❌ Errors for breaking changes

---

### 2. Format Compatibility Verification

**Checks:**
- ✅ Query utility returns `{ data, error }` format (same as Supabase)
- ✅ Error objects have `message` and `code` properties
- ✅ Date range filtering methods (gte/lte) work correctly
- ✅ Count option is supported

**Script:** `scripts/verify-query-format-compatibility.ts`

**Run:**
```bash
npx tsx scripts/verify-query-format-compatibility.ts
```

**Output:**
- ✅ Format compatibility test results
- ❌ Failures if format doesn't match

**Note:** This requires a database connection. It's safe to run in development.

---

### 3. Type Safety Verification

**Checks:**
- ✅ TypeScript compilation passes
- ✅ No type errors in migrated files
- ✅ Query utility types are correct

**Run:**
```bash
npm run type-check
# or
npx tsc --noEmit
```

**Output:**
- ✅ Type errors if any
- ✅ Compilation success/failure

---

### 4. Linting Verification

**Checks:**
- ✅ No linting errors
- ✅ Code style is consistent
- ✅ No unused variables

**Run:**
```bash
npm run lint
```

**Output:**
- ✅ Linting errors if any
- ✅ Code style warnings

---

### 5. Import/Export Verification

**Checks:**
- ✅ All imports are valid
- ✅ Query utility is exported correctly
- ✅ No circular dependencies

**Run:**
```bash
npx tsx scripts/verify-query-migration.ts
```

**Output:**
- ✅ Import errors if any
- ✅ Missing import warnings

---

## 🚀 Automated Verification Workflow

### Quick Check (1 minute)

```bash
# Run all automated checks
npm run verify-migration
```

**What it checks:**
1. Code structure (imports, query usage)
2. Type safety (TypeScript compilation)
3. Linting (code style)
4. Format compatibility (if database available)

**Output:**
- ✅ Pass/Fail summary
- ⚠️  Warnings for review
- ❌ Errors that must be fixed

---

### Full Verification (5 minutes)

```bash
# 1. Code structure
npx tsx scripts/verify-query-migration.ts

# 2. Type safety
npx tsc --noEmit

# 3. Linting
npm run lint

# 4. Format compatibility (optional, requires DB)
npx tsx scripts/verify-query-format-compatibility.ts
```

---

## 📋 Automated Checks Checklist

### Before Committing

- [ ] Run `npx tsx scripts/verify-query-migration.ts` - Should pass
- [ ] Run `npx tsc --noEmit` - Should pass
- [ ] Run `npm run lint` - Should pass
- [ ] Review warnings from verification script

### After Migration

- [ ] All automated checks pass
- [ ] No breaking changes detected
- [ ] Warnings are acceptable
- [ ] Code structure is correct

---

## 🔍 What Each Check Verifies

### Code Structure Check (`verify-query-migration.ts`)

**Checks:**
1. **Import verification:** Query utility is imported correctly
2. **Direct query detection:** No `supabase.from()` table queries in migrated files
3. **Query usage:** Query utility is used for table queries
4. **Log prefixes:** Log prefixes are present in query calls
5. **Error handling:** Error handling patterns are maintained
6. **API compatibility:** Query builder methods are used correctly

**What it catches:**
- ❌ Missing query utility imports
- ❌ Direct Supabase queries still present
- ❌ Missing log prefixes
- ❌ Incorrect error handling
- ❌ API incompatibility

**What it doesn't catch:**
- ⚠️  Runtime behavior changes
- ⚠️  Performance issues
- ⚠️  Database query correctness

---

### Format Compatibility Check (`verify-query-format-compatibility.ts`)

**Checks:**
1. **Return format:** Query utility returns `{ data, error }` format
2. **Error structure:** Error objects have expected properties
3. **Method support:** Query builder methods work correctly
4. **Date filtering:** gte/lte methods work
5. **Count option:** Count option is supported

**What it catches:**
- ❌ Format incompatibility
- ❌ Missing error properties
- ❌ Method not working
- ❌ API incompatibility

**What it doesn't catch:**
- ⚠️  Data correctness
- ⚠️  RLS policy issues
- ⚠️  Performance problems

---

### Type Safety Check (`tsc --noEmit`)

**Checks:**
1. **Type errors:** All types are correct
2. **Type compatibility:** Query utility types match Supabase types
3. **Import types:** All imports are valid

**What it catches:**
- ❌ Type errors
- ❌ Type incompatibility
- ❌ Missing type definitions

**What it doesn't catch:**
- ⚠️  Runtime errors
- ⚠️  Logic errors

---

### Linting Check (`npm run lint`)

**Checks:**
1. **Code style:** Code follows style guide
2. **Unused code:** No unused variables/functions
3. **Best practices:** Code follows best practices

**What it catches:**
- ❌ Code style violations
- ❌ Unused code
- ❌ Best practice violations

**What it doesn't catch:**
- ⚠️  Logic errors
- ⚠️  Runtime errors

---

## 🎯 What Still Requires Manual Testing

### Critical Paths (Require Manual Testing)

1. **Profile Updates:**
   - ✅ Code structure: Automated
   - ⚠️  Actual profile save: Manual test required
   - ⚠️  Name preservation: Manual test required
   - ⚠️  Immutable field handling: Manual test required

2. **Analytics Tracking:**
   - ✅ Code structure: Automated
   - ⚠️  Event tracking: Manual test required
   - ⚠️  Attribution linking: Manual test required
   - ⚠️  Dashboard display: Manual test required

3. **Email Notifications:**
   - ✅ Code structure: Automated
   - ⚠️  Email preference check: Manual test required
   - ⚠️  Email sending: Manual test required

### Why Manual Testing is Still Needed

**Automated checks verify:**
- ✅ Code structure is correct
- ✅ Types are correct
- ✅ Format is compatible
- ✅ No syntax errors

**Manual testing verifies:**
- ⚠️  Runtime behavior is correct
- ⚠️  Data is saved correctly
- ⚠️  Errors are handled correctly
- ⚠️  User experience is correct

---

## 🔧 Setting Up Automated Checks

### Add to package.json

```json
{
  "scripts": {
    "verify-migration": "tsx scripts/verify-query-migration.ts && tsc --noEmit && npm run lint",
    "verify-format": "tsx scripts/verify-query-format-compatibility.ts"
  }
}
```

### Run Before Committing

```bash
npm run verify-migration
```

### Run in CI/CD

```yaml
# .github/workflows/verify-migration.yml
- name: Verify Migration
  run: npm run verify-migration
```

---

## 📊 Verification Results

### Success Criteria

**Automated checks pass if:**
- ✅ All migrated files use query utility correctly
- ✅ No direct Supabase queries in migrated files
- ✅ TypeScript compilation passes
- ✅ Linting passes
- ✅ Format compatibility verified

**Manual testing still needed for:**
- ⚠️  Runtime behavior verification
- ⚠️  Data correctness verification
- ⚠️  User experience verification

---

## 🚨 Common Issues Detected Automatically

### Issue 1: Missing Query Utility Import

**Detected by:** `verify-query-migration.ts`

**Error:**
```
❌ Missing query utility import
```

**Fix:**
```typescript
// Add import
import { query } from '../lib/supabaseQuery'
```

---

### Issue 2: Direct Supabase Query Still Present

**Detected by:** `verify-query-migration.ts`

**Error:**
```
❌ Found 2 direct Supabase table queries (should use query utility)
```

**Fix:**
```typescript
// Replace
const { data } = await supabase.from('profiles').select('*')

// With
const { data } = await query('profiles').select('*')
```

---

### Issue 3: Missing Log Prefix

**Detected by:** `verify-query-migration.ts`

**Warning:**
```
⚠️  Query call missing logPrefix
```

**Fix:**
```typescript
// Add logPrefix
const { data } = await query('profiles', { logPrefix: '[MyComponent]' }).select('*')
```

---

### Issue 4: Format Incompatibility

**Detected by:** `verify-query-format-compatibility.ts`

**Error:**
```
❌ Query utility does not return { data, error } format
```

**Fix:**
- Check query utility implementation
- Verify `then()` method returns correct format

---

## ✅ Summary

### What Can Be Automated (100%)

1. ✅ Code structure verification
2. ✅ Type safety verification
3. ✅ Linting verification
4. ✅ Format compatibility verification
5. ✅ Import/export verification

### What Still Requires Manual Testing

1. ⚠️  Runtime behavior verification
2. ⚠️  Data correctness verification
3. ⚠️  User experience verification
4. ⚠️  Error handling in real scenarios

### Recommendation

**Run automated checks:**
- ✅ Before every commit
- ✅ In CI/CD pipeline
- ✅ After every migration

**Run manual tests:**
- ⚠️  After automated checks pass
- ⚠️  For critical paths only
- ⚠️  When making significant changes

---

**Last Updated:** 2025-01-XX  
**Status:** Automated Checks Available

