# Unsplash API Setup (Optional)

## Quick Start

Event header images work **without any setup** using beautiful gradient fallbacks!

However, if you want real photos from Unsplash:

## Step 1: Get API Key (5 minutes)

1. **Go to** https://unsplash.com/developers
2. **Sign up** for a free account (or sign in)
3. **Click** "New Application"
4. **Accept** the API terms
5. **Fill out** the form:
   - Application name: "Bonita Forward Calendar"
   - Description: "Event images for community calendar"
6. **Copy** your "Access Key"

## Step 2: Add to Project

Create or edit `.env` file in project root:

```bash
VITE_UNSPLASH_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
```

## Step 3: Restart Dev Server

```bash
npm run dev
```

## That's it! 🎉

Images will now load from Unsplash. If the API is unavailable, gradients are automatically used as fallback.

---

## Free Tier Limits

- **50 requests per hour**
- **50,000 requests per month**

This is more than enough for your calendar!

---

## Troubleshooting

### Images not showing?
1. Check `.env` file has correct key
2. Restart dev server after adding key
3. Check browser console for errors
4. Verify you're within rate limits

### Don't want to use Unsplash?
No problem! Simply don't add the API key. Beautiful gradients will be used instead.

---

## Environment Variables

Your `.env` file should look like:

```bash
# Supabase (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Unsplash (Optional)
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_key
```

---

## Security Note

Never commit `.env` file to git! It's already in `.gitignore`.

---

## Cost

**100% FREE** with Unsplash's generous free tier.

Upgrade plans available if you need more than 50,000 requests/month (unlikely for most apps).

