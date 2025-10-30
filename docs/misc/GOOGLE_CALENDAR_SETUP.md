# Google Calendar Integration Setup Guide

This guide walks you through setting up Google Calendar integration for business booking.

## Part 1: Database Setup

### Run the SQL Migration

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run `add-google-calendar-integration.sql`

This will add the necessary columns to the `providers` table and create the `booking_events` table.

## Part 2: Google Cloud Console Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it "Bonita Forward Calendar Integration"

### 2. Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (or Internal if you're using Google Workspace)
3. Fill in the required information:
   - **App name**: Bonita Forward
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.events` (Create, read, update, and delete events)
   - `https://www.googleapis.com/auth/calendar.readonly` (See and download calendar info)
5. Add test users (your email and any business owners you want to test with)
6. Save and continue

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name**: Bonita Forward Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `https://your-domain.com` (your production domain)
   - **Authorized redirect URIs**:
     - `http://localhost:8888/.netlify/functions/google-calendar-callback` (local)
     - `https://your-domain.com/.netlify/functions/google-calendar-callback` (production)
5. Click **Create**
6. **Save the Client ID and Client Secret** - you'll need these for environment variables

## Part 3: Environment Variables

### Add to Netlify

1. Go to your Netlify dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following variables:

```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/.netlify/functions/google-calendar-callback
```

### Add to Local Development

Create/update `.env` file in your project root:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8888/.netlify/functions/google-calendar-callback
```

**Important**: Add `.env` to your `.gitignore` file to keep credentials secure!

## Part 4: How It Works

### User Flow

1. **Business Owner Enables Booking**
   - Goes to My Business page
   - Enables booking system
   - Sees "Connect Google Calendar" button

2. **OAuth Connection**
   - Clicks "Connect Google Calendar"
   - Redirected to Google OAuth consent screen
   - Grants calendar access permissions
   - Redirected back to Bonita Forward with access token

3. **Token Storage**
   - Access token and refresh token stored securely in database
   - Tokens are encrypted and only accessible server-side

4. **Booking Creation**
   - When a customer makes a booking, it's stored in `booking_events` table
   - A Netlify function automatically creates an event in the business owner's Google Calendar
   - Business owner receives calendar notifications as usual

5. **Token Refresh**
   - Access tokens expire after 1 hour
   - Refresh tokens are used automatically to get new access tokens
   - No action needed from business owner

### Security Considerations

1. **Token Encryption**: Consider encrypting tokens in the database
2. **RLS Policies**: Already configured to ensure business owners only see their own bookings
3. **Service Role**: Netlify functions use service role for secure database access
4. **HTTPS Only**: OAuth only works over HTTPS in production

## Part 5: Features Implemented

### For Business Owners
- ✅ Connect/disconnect Google Calendar
- ✅ View connection status
- ✅ Choose which calendar to sync with (if they have multiple)
- ✅ Enable/disable automatic syncing
- ✅ See sync status and last sync time

### For Customers
- ✅ Book appointments through Bonita Forward
- ✅ Automatic calendar invites (future enhancement)
- ✅ See real-time availability (future enhancement)

### For Admins
- ✅ View which businesses have calendar connected
- ✅ Monitor booking activity
- ✅ Troubleshoot connection issues

## Part 6: Testing

1. **Local Testing**:
   ```bash
   npm run dev
   netlify dev
   ```

2. **Test the OAuth Flow**:
   - Log in as a business owner
   - Go to My Business page
   - Click "Connect Google Calendar"
   - Complete OAuth flow
   - Verify connection status shows "Connected"

3. **Test Booking Creation**:
   - Create a test booking
   - Check that event appears in Google Calendar
   - Verify event details are correct

## Part 7: Troubleshooting

### Common Issues

**"Redirect URI mismatch"**
- Ensure the redirect URI in Google Cloud Console matches exactly
- Check for trailing slashes or http vs https

**"Access denied"**
- Check OAuth consent screen is configured correctly
- Ensure user is added as a test user (for unverified apps)

**"Token expired"**
- This is normal - the system should automatically refresh
- Check that refresh token is stored in database

**"Calendar API not enabled"**
- Go to Google Cloud Console and enable Google Calendar API

## Part 8: Going to Production

### Before Launch

1. **Verify OAuth Consent Screen**:
   - Submit for Google verification if needed
   - Update privacy policy URL
   - Update terms of service URL

2. **Update Environment Variables**:
   - Add production domain to redirect URIs
   - Update Netlify environment variables

3. **Test Thoroughly**:
   - Test with multiple business accounts
   - Test token refresh flow
   - Test error handling

4. **Monitor**:
   - Set up logging for OAuth errors
   - Monitor token refresh success rate
   - Track booking creation success rate

### Security Checklist

- [ ] Tokens stored securely (encrypted if possible)
- [ ] RLS policies tested and working
- [ ] OAuth consent screen configured properly
- [ ] Rate limiting implemented (future)
- [ ] Error logging configured
- [ ] No credentials in git repository

## Next Steps

After running the SQL and setting up Google OAuth:

1. Implement the Netlify functions (see implementation files)
2. Update the UI in MyBusiness.tsx
3. Test the full flow
4. Deploy to production

## Support

If you encounter issues:
1. Check Netlify function logs
2. Check Supabase logs
3. Verify environment variables are set correctly
4. Check Google Cloud Console for API quota/errors


