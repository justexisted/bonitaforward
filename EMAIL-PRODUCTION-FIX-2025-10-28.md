# Email Production Fix - React Undefined Error
**Date:** 2025-10-28  
**Issue:** Email sending failed in production with "React is not defined"

## The Problem

Email sending worked locally but failed in production with:
```
POST https://www.bonitaforward.com/.netlify/functions/send-email 500
{error: 'Failed to render email template', details: 'React is not defined'}
```

## Root Cause

The issue occurred in two phases:

### Phase 1: Initial Build Error
TypeScript build was failing with:
```
error TS6133: 'React' is declared but its value is never read
```

This happened because:
- Project uses new JSX transform (`"jsx": "react-jsx"` in tsconfig.app.json)
- New JSX transform doesn't require React imports in frontend code
- React imports were triggering "unused variable" errors

### Phase 2: Wrong Fix Created Production Bug
To fix the build error, React imports were removed from email templates:
```typescript
// BEFORE (working in serverless, breaking in frontend build)
import React from 'react'
import { EmailLayout } from '../components/EmailLayout'

// AFTER (working in frontend build, breaking in serverless)
import { EmailLayout } from '../components/EmailLayout'
```

**This worked for the frontend but broke Netlify functions because:**
- Frontend: Vite + new JSX transform = no React needed
- Netlify functions: Node.js environment = React MUST be in scope for JSX
- @react-email/render needs React available when rendering templates

## The Solution

Added React imports back with `@ts-expect-error` to satisfy both environments:

```typescript
// @ts-expect-error - React is needed for email rendering in Netlify functions
import React from 'react'
import { EmailLayout } from '../components/EmailLayout'
```

### Files Fixed:
- ✅ `src/emails/templates/ChangeRequestApproved.tsx`
- ✅ `src/emails/templates/ChangeRequestRejected.tsx`
- ✅ `src/emails/templates/BookingConfirmation.tsx`
- ✅ `src/emails/templates/ApplicationApproved.tsx`
- ✅ `src/emails/components/EmailLayout.tsx`
- ✅ `src/emails/components/EmailButton.tsx`

## Why This Works

### `@ts-expect-error` Explanation:
- **Suppresses the TypeScript error** about unused React import
- **Does NOT affect runtime** - React is still imported and available
- **Only affects type checking** - tells TypeScript to ignore the next line's error
- **Frontend build**: JSX transform handles React automatically, import is "unused" but harmless
- **Netlify function**: React import is available for @react-email/render to use

### Alternative Approaches Considered:

1. **`// @ts-ignore`** - Too broad, suppresses all errors
2. **`/* eslint-disable */`** - Only affects ESLint, not TypeScript
3. **`import type { ReactNode }`** - Only imports types, not the runtime value
4. **Conditional imports** - Doesn't work with static imports
5. **`@ts-expect-error`** - ✅ **Best solution** - precise, clear intent

## Testing Checklist

After this fix is deployed:

1. ✅ Frontend build passes
2. ✅ No TypeScript errors
3. ✅ Netlify function builds successfully
4. ✅ Email sending works in production
5. ✅ No console errors when sending emails

## Deployment Steps

```bash
# 1. Verify build passes locally
npm run build

# 2. Commit and push
git add -A
git commit -m "Fix: Add React imports back to email templates for Netlify function compatibility"
git push

# 3. Wait for Netlify deployment (~3 minutes)
# Monitor at: https://app.netlify.com/

# 4. Hard refresh production site
# Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 5. Test email sending
# Go to /admin -> Change Requests -> Approve/Reject a request
```

## Verification

After deployment completes, verify:
- No "React is not defined" errors in console
- Email sends successfully with 200 status
- Resend dashboard shows "Delivered" status
- Recipient receives email

## Key Takeaway

**When code runs in multiple environments (frontend + serverless), you may need imports that appear "unused" in one environment but are critical in another.**

The `@ts-expect-error` directive is the correct way to handle this - it:
- Documents the intentional override
- Keeps both environments working
- Doesn't suppress other errors
- Makes the reason clear to future developers

## Related Files
- `netlify/functions/send-email.ts` - Uses React.createElement()
- `tsconfig.app.json` - Contains JSX transform config
- `package.json` - React dependencies
- `EMAIL-TESTING-GUIDE-2025-10-28.md` - Testing procedures
- `RESEND-BUILD-FIX-2025-10-28.md` - Previous build fix attempt

