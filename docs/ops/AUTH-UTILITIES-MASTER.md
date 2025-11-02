# Authentication Utilities Master Reference
**Last Updated:** 2025-01-XX  
**Purpose:** Master reference for all authentication and admin verification utilities in Netlify functions

---

## 📋 Overview

This document tracks the shared authentication utilities used across all Netlify functions. These utilities standardize token verification, admin checks, and error handling.

**Location:** `netlify/functions/utils/`

---

## 🗂️ Utility Modules

### 1. `auth.ts` - Token Verification
**Purpose:** Extract and verify JWT tokens using Supabase REST API

**Key Functions:**
- `extractToken(event)` - Extracts JWT from Authorization header
- `verifyToken(token, supabaseUrl, anonKey)` - Verifies token via Supabase `/auth/v1/user` endpoint
- `extractAndVerifyToken(event, supabaseUrl, anonKey)` - Combined extraction and verification

**Why REST API instead of `auth.getUser()`?**
- `supabase.auth.getUser(token)` is unreliable in Netlify serverless functions
- Serverless functions lack persistent session context
- Direct REST API calls (`${SUPABASE_URL}/auth/v1/user`) work reliably

**Implementation Notes:**
- Uses `GET /auth/v1/user` with `Authorization: Bearer {token}` header
- Falls back to `POST` if GET returns 403 (some Supabase configs require POST)
- Includes `x-client-info` header for GoTrue API compatibility
- Detailed logging for debugging token verification failures

---

### 2. `admin.ts` - Admin Verification
**Purpose:** Check if user has admin privileges via email list or database flag

**Key Functions:**
- `checkEmailAdmin(email, adminEmails?)` - Checks email against admin list
- `checkDatabaseAdmin(userId, supabaseClient)` - Checks `is_admin` flag in profiles table
- `checkIsAdmin(userId, email, supabaseClient, adminEmails?)` - Combined check (email OR database)

**Admin Check Methods:**
1. **Email-based:** Checks against `VITE_ADMIN_EMAILS` or `ADMIN_EMAILS` env var
2. **Database-based:** Checks `profiles.is_admin` boolean flag
3. **Fallback:** Defaults to `justexisted@gmail.com` if no env var set

**Returns:** `{ isAdmin: boolean, method: 'email' | 'database' | 'fallback', userId, email }`

---

### 3. `env.ts` - Environment Variables
**Purpose:** Standardized environment variable access with fallbacks

**Key Functions:**
- `getEnv(name, fallbackName?)` - Gets env var, throws if missing
- `getEnvSafe(name, fallbackName?)` - Gets env var, returns empty string if missing
- `getSupabaseConfig()` - Returns `{ url, serviceRole, anonKey }` from env

**Standardized CORS Headers:**
```typescript
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'Content-Type': 'application/json'
}
```

---

### 4. `response.ts` - Response Utilities
**Purpose:** Standardized error and success response formats

**Key Functions:**
- `errorResponse(statusCode, error, details?, extra?, headers?)` - Creates standardized error response
- `successResponse(data, statusCode?, headers?)` - Creates standardized success response
- `handleOptions()` - Handles OPTIONS/preflight requests

**Standard Response Format:**
```typescript
{
  statusCode: number,
  headers: Record<string, string>,
  body: string // JSON stringified
}
```

---

### 5. `authAdmin.ts` - Combined Auth + Admin
**Purpose:** Most functions need both - this combines them for convenience

**Key Functions:**
- `verifyAuthAndAdmin(event)` - Complete auth + admin verification in one call
- `authAdminErrorResponse(result)` - Get standardized 401/403 error response

**Returns:** `{ success, userId, email, isAdmin, adminMethod, supabaseClient, error, statusCode }`

**Usage Pattern:**
```typescript
const authAdminResult = await verifyAuthAndAdmin(event)
if (!authAdminResult.success || !authAdminResult.supabaseClient) {
  return authAdminErrorResponse(authAdminResult)
}
const { supabaseClient, userId, email } = authAdminResult
```

---

## 📝 Standard Pattern for Admin Functions

**Before (duplicated code in every function):**
```typescript
// 20+ lines of duplicate auth code per function
const authHeader = event.headers['authorization']
const token = authHeader?.startsWith('Bearer ') ? ...
const SUPABASE_URL = getEnv(...)
// ... 15+ more lines of auth/admin checking
```

**After (1 line):**
```typescript
const authAdminResult = await verifyAuthAndAdmin(event)
if (!authAdminResult.success || !authAdminResult.supabaseClient) {
  return authAdminErrorResponse(authAdminResult)
}
const { supabaseClient } = authAdminResult
// Ready to use!
```

---

## ✅ Functions Updated to Use Shared Utilities

All admin functions now use shared utilities (as of 2025-01-XX):

1. ✅ `admin-list-profiles.ts`
2. ✅ `admin-list-change-requests.ts`
3. ✅ `admin-list-job-posts.ts`
4. ✅ `admin-list-booking-events.ts`
5. ✅ `admin-update-provider.ts`
6. ✅ `admin-verify.ts`
7. ✅ `admin-delete-user.ts`
8. ✅ `admin-sync-profile.ts`
9. ✅ `admin-get-user.ts`
10. ✅ `admin-get-business-details.ts`

**Non-admin functions updated:**
11. ✅ `delete-business-listing.ts` (ownership verification)
12. ✅ `user-delete.ts` (self-delete)

---

## 🔧 Key Fixes Applied

### Fix #1: Token Verification (2025-01-XX)
**Problem:** `supabase.auth.getUser(token)` failing with "Auth session missing!" in serverless  
**Root Cause:** Serverless functions lack persistent session context  
**Solution:** Replaced with direct REST API call to `${SUPABASE_URL}/auth/v1/user`  
**Status:** ✅ FIXED - All functions now use `verifyToken()` from `auth.ts`

### Fix #2: Code Duplication (2025-01-XX)
**Problem:** 20+ lines of duplicate auth/admin code in every function  
**Solution:** Created shared utilities (`auth.ts`, `admin.ts`, `authAdmin.ts`)  
**Result:** Reduced to 3 lines per function  
**Status:** ✅ COMPLETE - All functions refactored

### Fix #3: Error Handling Standardization (2025-01-XX)
**Problem:** Inconsistent error formats across functions  
**Solution:** Created `response.ts` with `errorResponse()` and `successResponse()`  
**Result:** All functions return consistent JSON error/success responses  
**Status:** ✅ COMPLETE

### Fix #4: Environment Variable Handling (2025-01-XX)
**Problem:** Inconsistent env var access patterns (`requireEnv`, `getEnv`, etc.)  
**Solution:** Centralized in `env.ts` with `getSupabaseConfig()`  
**Result:** Single source of truth for Supabase configuration  
**Status:** ✅ COMPLETE

---

## 🚨 Common Issues and Solutions

### Issue: 403 Forbidden on Token Verification
**Symptoms:** `Token verification failed: 403` in logs  
**Possible Causes:**
1. Token expired - user needs to re-authenticate
2. Wrong ANON key - check `VITE_SUPABASE_ANON_KEY` env var
3. Supabase project mismatch - URL and key from different projects

**Debug Steps:**
1. Check Netlify function logs for detailed error from Supabase
2. Verify `SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
3. Check if token is expired (try logging token expiration)

### Issue: 401 Unauthorized - "No token provided"
**Symptoms:** `No token provided` error  
**Possible Causes:**
1. Frontend not sending `Authorization` header
2. Header name mismatch (should be `Authorization` or `authorization`)

**Debug Steps:**
1. Check frontend code sends `Authorization: Bearer {token}` header
2. Check function logs to see what headers were received

---

## ✅ Verification Checklist

Before deploying changes to auth utilities:

- [ ] All admin functions use `verifyAuthAndAdmin()` 
- [ ] All functions use `errorResponse()` and `successResponse()`
- [ ] All functions use `getSupabaseConfig()` for env vars
- [ ] OPTIONS/preflight handled with `handleOptions()`
- [ ] CORS headers included in all responses
- [ ] Error logging includes detailed Supabase error messages
- [ ] Token verification uses REST API (not `auth.getUser()`)

---

## 📖 Reference Files

- **Auth Utils:** `netlify/functions/utils/auth.ts`
- **Admin Utils:** `netlify/functions/utils/admin.ts`
- **Env Utils:** `netlify/functions/utils/env.ts`
- **Response Utils:** `netlify/functions/utils/response.ts`
- **Combined Utils:** `netlify/functions/utils/authAdmin.ts`

---

## 📝 Change Log

### 2025-01-XX - Authentication Utilities Refactoring ✅ COMPLETE
- **Issue:** Duplicate auth code in every function, `auth.getUser()` failing in serverless
- **Solution:** Created shared utility modules for auth, admin, env, and responses
- **Functions Updated:** 12 total (10 admin + 2 non-admin)
- **Result:** 
  - Reduced code duplication from 20+ lines to 3 lines per function
  - Fixed token verification using REST API instead of `auth.getUser()`
  - Standardized error handling and responses
  - Centralized environment variable access
- **Status:** ✅ COMPLETE - All functions refactored and working

---

**Remember:** Always use shared utilities instead of duplicating auth/admin logic. If you need new functionality, add it to the utilities, not to individual functions.

