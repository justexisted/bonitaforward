# Bonita Forward - Troubleshooting Guide

## Common Issues and Solutions

### 1. Environment Variables Issues

**Symptoms:** 
- Authentication failures
- "Missing Supabase environment variables" errors
- Netlify functions returning 500 errors

**Solution:**
Ensure these environment variables are set:

```bash
# Required for client-side
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SITE_URL=your_site_url

# Required for Netlify functions (server-side)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Admin Page Issues

**Symptoms:**
- 400 errors when fetching business details
- "See More" button not working
- Business applications not showing

**Solutions:**
- ✅ **Fixed:** Created `admin-get-business-details` Netlify function
- ✅ **Fixed:** Added proper business applications UI section
- ✅ **Fixed:** Updated admin page to use Netlify functions

### 3. User Deletion Issues

**Symptoms:**
- "Database error deleting user" messages
- Users remain in authentication area
- Funnel responses not deleted

**Solutions:**
- ✅ **Fixed:** Enhanced `admin-delete-user` Netlify function
- ✅ **Fixed:** Added comprehensive data cleanup
- ✅ **Fixed:** Improved client-side error handling

### 4. Business Listing Deletion Issues

**Symptoms:**
- "Failed to delete listing - no rows affected"
- Listings appear deleted but still show up

**Solutions:**
- ✅ **Fixed:** Created `delete-business-listing` Netlify function
- ✅ **Fixed:** Bypasses RLS with SERVICE_ROLE_KEY
- ✅ **Fixed:** Proper foreign key constraint handling

### 5. Sign-up Issues

**Symptoms:**
- "user already registered" errors
- Users can't create accounts

**Solutions:**
- ✅ **Fixed:** Enhanced error handling in SignIn.tsx
- ✅ **Fixed:** Better Supabase response parsing
- ✅ **Fixed:** Improved user feedback messages

### 6. Calendar Event Tooltip Issues

**Symptoms:**
- Event tooltips clipped or not visible
- Can't read full event names

**Solutions:**
- ✅ **Fixed:** Increased z-index to z-50
- ✅ **Fixed:** Added text wrapping for long names
- ✅ **Fixed:** Removed overflow constraints

## Quick Diagnostic Commands

### Check Environment Variables
```bash
# Check if .env file exists and has required variables
cat .env | grep VITE_SUPABASE
```

### Test Netlify Functions Locally
```bash
# Start Netlify dev server
npx netlify dev
```

### Check Build Status
```bash
# Build the application
npm run build

# Check for TypeScript errors
npx tsc -b --noEmit
```

## Deployment Checklist

1. ✅ All Netlify functions are present in `/netlify/functions/`
2. ✅ Environment variables are set in Netlify dashboard
3. ✅ Build completes without errors
4. ✅ Database RLS policies are properly configured

## Recent Fixes Applied

- **Admin Business Details:** Created Netlify function to bypass RLS
- **Business Applications:** Added dedicated UI section
- **User Deletion:** Enhanced with comprehensive cleanup
- **Business Listing Deletion:** Fixed RLS issues
- **Calendar Tooltips:** Improved visibility and text wrapping
- **Sign-up Errors:** Better error handling and messages

## If Issues Persist

1. Check browser console for specific error messages
2. Verify environment variables in Netlify dashboard
3. Check Netlify function logs in the dashboard
4. Ensure database permissions are correct
5. Try clearing browser cache and localStorage
