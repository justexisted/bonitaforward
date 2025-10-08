# Netlify Environment Variables Fix

## Problem

Your scheduled function was failing with the error:
```
Error: supabaseKey is required.
```

This happened because the Netlify functions were incorrectly trying to access `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These environment variables with the `VITE_` prefix are **only available during frontend build time** via Vite, not in serverless functions.

## What Was Fixed

Updated the following Netlify functions to use the correct environment variable names:

1. ✅ `netlify/functions/scheduled-fetch-events.ts`
   - Changed from: `process.env.VITE_SUPABASE_URL`
   - Changed to: `process.env.SUPABASE_URL`

2. ✅ `netlify/functions/manual-fetch-events.ts`
   - Changed from: `process.env.VITE_SUPABASE_URL`
   - Changed to: `process.env.SUPABASE_URL`

3. ✅ `netlify/functions/api-events.ts`
   - Changed from: `process.env.VITE_SUPABASE_URL` and `process.env.VITE_SUPABASE_ANON_KEY`
   - Changed to: `process.env.SUPABASE_URL` and `process.env.SUPABASE_ANON_KEY`

The following functions already had correct configuration or fallback logic:
- ✅ `admin-verify.ts` (already uses `SUPABASE_URL`)
- ✅ `admin-delete-user.ts` (already uses `SUPABASE_URL`)
- ✅ `admin-list-profiles.ts` (has fallback logic)
- ✅ `user-delete.ts` (has fallback logic)
- ✅ `ical-proxy.ts` (doesn't use Supabase)

## What You Need to Do

### Step 1: Set Environment Variables in Netlify

Go to your Netlify dashboard and add these environment variables:

1. **Site Settings** → **Environment variables** → **Add a variable**

2. Add the following variables (without the `VITE_` prefix):

   | Variable Name | Description |
   |--------------|-------------|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (for admin operations) |
   | `ADMIN_EMAILS` | Comma-separated list of admin emails (optional, has fallback) |

3. **Important**: Make sure these are set for **all deploy contexts** (Production, Deploy Previews, and Branch deploys)

### Step 2: Redeploy Your Site

After setting the environment variables:

1. Commit and push the code changes:
   ```bash
   git add netlify/functions/
   git commit -m "Fix: Use correct env vars for Netlify functions (remove VITE_ prefix)"
   git push
   ```

2. Or manually trigger a redeploy in Netlify:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

### Step 3: Verify the Fix

After deployment:

1. Check the **Functions** tab in Netlify to see if functions are deploying successfully
2. Check the **Function logs** to verify the scheduled function runs without errors
3. The scheduled function should run every 4 hours automatically

### Expected Environment Variables

**Frontend (Vite):**
- `VITE_SUPABASE_URL` - Used by the React app during build
- `VITE_SUPABASE_ANON_KEY` - Used by the React app during build

**Backend (Netlify Functions):**
- `SUPABASE_URL` - Used by serverless functions at runtime
- `SUPABASE_ANON_KEY` - Used by serverless functions at runtime
- `SUPABASE_SERVICE_ROLE_KEY` - Used for admin operations

You need **both sets** of environment variables in Netlify:
- The `VITE_*` ones for building the frontend
- The non-prefixed ones for running the serverless functions

## Why This Happened

Vite environment variables (prefixed with `VITE_`) are injected into the frontend code during the build process. They become hardcoded strings in your built JavaScript files and are not available at runtime in serverless functions.

Netlify Functions run in a Node.js environment separate from the frontend build process, so they need their own set of environment variables without the `VITE_` prefix.

## Testing

After setting the environment variables and redeploying, you can test the manual fetch function:

```bash
# Test the manual fetch function
curl https://your-site.netlify.app/.netlify/functions/manual-fetch-events
```

This should successfully fetch and store calendar events without errors.

