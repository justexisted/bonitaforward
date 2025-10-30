# Environment Variables Setup - REQUIRED FOR LOCAL DEVELOPMENT

## ⚠️ CRITICAL ISSUE IDENTIFIED

Your Netlify functions are failing with:
```
Failed to load change requests (HTTP 500): {"error":"Missing env SUPABASE_SERVICE_ROLE_KEY","requests":[]}
```

This means you **do not have a `.env` file** with the required environment variables for local development.

## 🔧 Quick Fix - Create .env File

### Step 1: Copy the Example File

```bash
# In your project root:
cp .env.example .env
```

### Step 2: Get Your Supabase Keys

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (bonita-forward)
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (already filled in: `https://bfsspdvdwgakolivwuko.supabase.co`)
   - **Anon (public) key** 
   - **Service Role (secret) key** ⚠️ **KEEP THIS SECRET!**

### Step 3: Edit Your .env File

Open the `.env` file you just created and replace these values:

```env
# Replace YOUR_ANON_KEY_HERE with your actual anon key:
VITE_SUPABASE_ANON_KEY=eyJhbGc...your_actual_anon_key_here

# Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual service role key:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_actual_service_role_key_here
```

### Step 4: Restart Netlify Dev

```bash
# Stop the current server (Ctrl+C)
# Then restart:
netlify dev
```

## 📋 Complete .env File Example

Your `.env` file should look like this (with your actual keys):

```env
# Supabase Configuration
SUPABASE_URL=https://bfsspdvdwgakolivwuko.supabase.co
VITE_SUPABASE_URL=https://bfsspdvdwgakolivwuko.supabase.co

# Your actual keys from Supabase Dashboard > Settings > API
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc3NwZHZkd2dha29saXZ3dWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyODM4MjQsImV4cCI6MjA1MTg1OTgyNH0...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc3NwZHZkd2dha29saXZ3dWtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI4MzgyNCwiZXhwIjoyMDUxODU5ODI0fQ...

# Admin Configuration
VITE_ADMIN_EMAILS=justexisted@gmail.com
ADMIN_EMAILS=justexisted@gmail.com

# Site Configuration
VITE_SITE_URL=http://localhost:8888
```

## 🔒 Security Notes

**IMPORTANT:**
- The `.env` file is already in `.gitignore` - it will NOT be committed to git
- **NEVER** share your `SUPABASE_SERVICE_ROLE_KEY` publicly
- **NEVER** commit the `.env` file to version control
- The service role key has full admin access to your database

## ✅ Verification

After creating the `.env` file and restarting `netlify dev`, you should see:

1. ✅ Netlify Dev starts without errors
2. ✅ Navigate to `/admin` page
3. ✅ Change requests load successfully
4. ✅ No more "Missing env SUPABASE_SERVICE_ROLE_KEY" errors

## 🚀 Netlify Production Deployment

For production (Netlify deployment):

1. Go to your Netlify dashboard
2. Site Settings → Environment Variables
3. Add the same variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_ADMIN_EMAILS`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - etc.

These are likely already set in production if the site is working there.

## 🐛 Troubleshooting

### Issue: Still getting "Missing env" errors

**Solution:** Make sure:
- The `.env` file is in the project root (same directory as `package.json`)
- You've restarted `netlify dev` after creating the file
- The keys don't have quotes around them
- There are no extra spaces

### Issue: "Invalid token" or "Unauthorized"

**Solution:**
- Verify you copied the correct keys from Supabase Dashboard
- Check that `VITE_ADMIN_EMAILS` includes your email
- Make sure you're signed in with the admin email

## 📁 File Structure

Your project should have:
```
bonita-forward/
├── .env                    ← CREATE THIS (not in git)
├── .env.example            ← Template (safe to commit)
├── .gitignore             ← Already contains .env
├── package.json
├── netlify.toml
└── ... other files
```

