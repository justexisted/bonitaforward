# Code Quality Checklist

## ⚠️ Critical: Before Every Code Commit

### 1. Run Linter Check (MANDATORY)
```bash
# Always run this before completing any code changes
npm run build  # or check in IDE
```

**Common Errors to Catch:**
- ❌ `TS6133` - Variable/function declared but never used
- ❌ `TS2305` - Module has no exported member
- ❌ `TS2307` - Cannot find module
- ❌ Unused imports

### 2. Check for Unused Declarations
**Before creating:**
- ✅ Functions → Will this be used immediately?
- ✅ Variables → Is this needed right now?
- ✅ Imports → Are all imports actually used?
- ✅ Helper functions → Are they called anywhere?

**If not used immediately:**
- Comment it out with `// TODO: Implement later`
- Or don't create it yet - wait until it's needed

### 3. Remove Placeholder Code
When creating partial implementations:
- ❌ Don't leave unused helper functions
- ❌ Don't create variables "for future use"
- ✅ Only include code that's actively used
- ✅ Add comments explaining what's missing

## Recent Issues Fixed

### Issue 1: `updateBusinessHours` unused function
**File:** `src/components/admin/ProviderEditForm.tsx`  
**Error:** `TS6133: 'updateBusinessHours' is declared but its value is never read`  
**Cause:** Created helper function but didn't implement business hours section  
**Fix:** Removed the unused function, added comment explaining it's for future use

### Issue 2: Build failures from unused variables
**Impact:** Netlify builds fail with exit code 2  
**User frustration:** High - causes deployment failures  
**Prevention:** Always run `read_lints` before finishing

## Best Practices

### When Creating Components

1. **Start minimal:**
   ```typescript
   // ✅ GOOD: Only what's needed now
   const MyComponent = ({ data }) => {
     return <div>{data.name}</div>
   }
   ```

2. **Don't pre-create helpers:**
   ```typescript
   // ❌ BAD: Unused helpers
   const MyComponent = ({ data }) => {
     const updateField = (field, value) => {} // Not used!
     const saveData = () => {} // Not used!
     return <div>{data.name}</div>
   }
   ```

3. **Add features incrementally:**
   - Create function → Use it immediately → Commit
   - Don't create infrastructure before it's needed

### When Extracting Code

1. **Check what's actually used:**
   ```typescript
   // Original has 10 helper functions
   // But only 3 are used in the section being extracted
   // → Only extract the 3 used functions
   ```

2. **Comment out future features:**
   ```typescript
   // TODO: Business hours editor (Step 4)
   // const updateBusinessHours = ...
   ```

3. **Test immediately:**
   - After extraction, run linter
   - Fix any unused declarations before moving on

## Automated Checks

### Pre-commit Hook (Future)
```bash
#!/bin/sh
npm run lint || exit 1
```

### IDE Configuration
- **VS Code:** Enable "Problems" panel
- **Cursor:** Shows errors inline
- **Settings:** `"typescript.showUnused": true`

## Memory Created

✅ Created memory to avoid declaring unused variables/functions  
✅ Will always run `read_lints` before finishing code changes  
✅ User prefers all declarations to be either used or removed

## Checklist Template

Copy this before finishing any code changes:

```
□ Ran read_lints tool
□ No TS6133 errors (unused declarations)
□ All imports are used
□ All functions are called
□ All variables are referenced
□ No placeholder code left in
□ Build would succeed
```

---

**Remember:** It's better to add code when needed than to create it "just in case" and leave it unused.

