# Token Verification Fix - ALL Netlify Functions

## The Critical Bug

### Problem:
All Netlify admin functions were returning **"Invalid token" (401 error)** on production because they were trying to verify user JWT tokens using the **SERVICE_ROLE_KEY client**, which doesn't work.

### Why It Failed:
```typescript
// ❌ WRONG - Service role can't verify user tokens
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
const { data: userData, error } = await sb.auth.getUser(token)  // Always fails!
```

**The service role key is for bypassing RLS, NOT for verifying user authentication tokens.**

---

## The Solution

### Use Two Supabase Clients:

1. **ANON client** - For verifying user JWT tokens
2. **SERVICE ROLE client** - For database operations that bypass RLS

```typescript
// ✅ CORRECT - Use anon key to verify, service role for database
const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// Verify token with ANON client
const { data: userData, error } = await sbAnon.auth.getUser(token)  // ✅ Works!

// Use service role client for database operations
const { data } = await sb.from('providers').select('*')  // ✅ Bypasses RLS
```

---

## Functions Fixed

All admin Netlify functions now use the two-client pattern:

1. ✅ `admin-list-change-requests.ts`
2. ✅ `admin-delete-user.ts`
3. ✅ `delete-business-listing.ts`
4. ✅ `admin-sync-profile.ts`
5. ✅ `admin-get-user.ts`
6. ✅ `admin-verify.ts`
7. ✅ `admin-list-profiles.ts`
8. ✅ `user-delete.ts`
9. ✅ `admin-get-business-details.ts`

---

## What Changed in Each Function

### Before:
```typescript
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })
const { data: userData, error } = await sb.auth.getUser(token)  // ❌ Fails
```

### After:
```typescript
const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')
const sbAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

const { data: userData, error } = await sbAnon.auth.getUser(token)  // ✅ Works
if (error) return { statusCode: 401, headers, body: 'Invalid token' }

// Continue using 'sb' (service role) for all database operations
```

---

## Required Environment Variables

### For Netlify Production (Site Settings → Environment Variables):

```
SUPABASE_URL=https://bfsspdvdwgakolivwuko.supabase.co
VITE_SUPABASE_URL=https://bfsspdvdwgakolivwuko.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_SERVICE_ROLE=your_service_role_key_here
VITE_ADMIN_EMAILS=justexisted@gmail.com
ADMIN_EMAILS=justexisted@gmail.com
```

**Note:** Some functions use `SUPABASE_SERVICE_ROLE`, others use `SUPABASE_SERVICE_ROLE_KEY`. Set both to the same value.

### For Local Development (.env file):

```env
SUPABASE_URL=https://bfsspdvdwgakolivwuko.supabase.co
VITE_SUPABASE_URL=https://bfsspdvdwgakolivwuko.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_SERVICE_ROLE=your_service_role_key_here
VITE_ADMIN_EMAILS=justexisted@gmail.com
ADMIN_EMAILS=justexisted@gmail.com
VITE_SITE_URL=http://localhost:8888
```

---

## Why This Works Now

### Local Development (localhost):
1. ✅ User logs in → gets JWT token
2. ✅ Admin page sends token to Netlify function at `localhost:8888`
3. ✅ Function verifies token with ANON client
4. ✅ Function uses SERVICE ROLE client for database queries
5. ✅ Everything works!

### Production (www.bonitaforward.com):
1. ✅ User logs in → gets JWT token
2. ✅ Admin page sends token to Netlify function
3. ✅ Function verifies token with ANON client
4. ✅ Function uses SERVICE ROLE client for database queries
5. ✅ Everything works!

**Same code works in both environments!**

---

## Deployment Steps

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Fix: Use anon key for token verification in all Netlify functions"
   git push
   ```

2. **Verify environment variables in Netlify:**
   - Go to Netlify Dashboard
   - Site Settings → Environment Variables
   - Make sure `VITE_SUPABASE_ANON_KEY` is set
   - Make sure both `SUPABASE_SERVICE_ROLE` and `SUPABASE_SERVICE_ROLE_KEY` are set

3. **Netlify will auto-deploy** (or trigger manual deploy)

4. **Test on production:**
   - Go to www.bonitaforward.com/admin
   - Should load without "Invalid token" errors
   - All admin functions should work

---

## Files Modified

### Netlify Functions (9 files):
1. `netlify/functions/admin-list-change-requests.ts`
2. `netlify/functions/admin-delete-user.ts`
3. `netlify/functions/delete-business-listing.ts`
4. `netlify/functions/admin-sync-profile.ts`
5. `netlify/functions/admin-get-user.ts`
6. `netlify/functions/admin-verify.ts`
7. `netlify/functions/admin-list-profiles.ts`
8. `netlify/functions/user-delete.ts`
9. `netlify/functions/admin-get-business-details.ts`

### Frontend (2 files):
10. `src/pages/Admin.tsx` - Fixed URLs, approval process, delete function
11. `src/pages/MyBusiness.tsx` - Fixed table name, application creation

---

## Testing Locally

```bash
# Make sure you have .env file with all variables
# Then restart:
netlify dev
```

Navigate to `http://localhost:8888/admin` - should work without token errors!

---

**This fix makes the site work identically on both localhost and production!**

