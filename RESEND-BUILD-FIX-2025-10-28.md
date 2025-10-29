# Resend Email Templates - Build Fix
**Date:** 2025-10-28

## Problem
Build was failing with TypeScript error `TS6133: 'React' is declared but its value is never read` in all email template files.

## Root Cause
The project uses the **new JSX transform** (`"jsx": "react-jsx"` in `tsconfig.app.json`), which means:
- React imports are **NOT required** in JSX/TSX files
- JSX is automatically transformed without needing `React` in scope
- Having `import React from 'react'` triggers the "unused variable" error due to `"noUnusedLocals": true`

## Solution

### 1. Email Templates (no React needed)
Removed React imports from all email template files:
- `src/emails/templates/ApplicationApproved.tsx`
- `src/emails/templates/BookingConfirmation.tsx`
- `src/emails/templates/ChangeRequestApproved.tsx`
- `src/emails/templates/ChangeRequestRejected.tsx`

### 2. Email Components (type-only imports)
Changed to type-only imports for `ReactNode` in components:
- `src/emails/components/EmailLayout.tsx`
- `src/emails/components/EmailButton.tsx`

**Before:**
```typescript
import React from 'react'
children: React.ReactNode
```

**After:**
```typescript
import type { ReactNode } from 'react'
children: ReactNode
```

### 3. Netlify Function (keep React)
**Kept** React import in `netlify/functions/send-email.ts` because it explicitly uses `React.createElement()` to render templates in the serverless environment.

## Result
✅ Build now passes with **0 errors**  
✅ Email templates work correctly  
✅ No linter warnings  
✅ Production deployment successful

## Key Takeaway
With the new JSX transform:
- **Frontend code**: Don't import React unless you explicitly use it
- **Serverless/Node environments**: Import React when using `React.createElement()` or `render()`
- **Type-only imports**: Use `import type { ... } from 'react'` for TypeScript types

