# Server-Side iCalendar Architecture

## Overview

This document describes the complete server-side iCalendar integration architecture that solves CORS issues and provides reliable, automated event aggregation from external sources.

## Architecture Components

### 1. **Scheduled Server-Side Processing** 
**File**: `netlify/functions/scheduled-fetch-events.ts`

- **Purpose**: Automatically fetches and processes iCalendar feeds every 4 hours
- **Trigger**: Netlify scheduled function (cron job)
- **Process**:
  1. Loops through configured iCalendar feed URLs
  2. Makes server-to-server HTTP requests (no CORS restrictions)
  3. Parses iCalendar content using ical.js library
  4. Stores processed events in Supabase database
  5. Removes duplicates and outdated events

### 2. **Manual Trigger Function**
**File**: `netlify/functions/manual-fetch-events.ts`

- **Purpose**: Allows manual triggering of iCalendar processing for testing
- **Endpoint**: `/.netlify/functions/manual-fetch-events`
- **Usage**: Admin panel "🔄 Refresh iCal Feeds" button
- **Features**: Detailed error reporting and feed-by-feed results

### 3. **Local API Endpoint**
**File**: `netlify/functions/api-events.ts`

- **Purpose**: Serves aggregated calendar events to frontend
- **Endpoint**: `/api/events`
- **Response**: Clean JSON with all events
- **Features**: Caching, error handling, CORS headers

### 4. **Frontend Integration**
**Files**: `src/pages/Calendar.tsx`, `src/pages/Admin.tsx`

- **Purpose**: Single request to local API instead of multiple external requests
- **Benefits**: No CORS issues, faster loading, more reliable
- **Fallback**: Direct database query if API fails

## Data Flow

```
External iCalendar Feeds
        ↓
Scheduled Function (every 4 hours)
        ↓
Server-to-Server HTTP Requests
        ↓
iCalendar Parsing (ical.js)
        ↓
Database Storage (Supabase)
        ↓
Local API (/api/events)
        ↓
Frontend Calendar Display
```

## Configuration

### iCalendar Feed Sources
Located in both scheduled and manual functions:

```typescript
const ICAL_FEEDS = [
  {
    url: 'https://www.sandiego.gov/calendar/events.ics',
    source: 'City of San Diego',
    category: 'Government',
    enabled: true
  },
  // ... additional feeds
]
```

### Scheduled Processing
- **Frequency**: Every 4 hours (`0 */4 * * *`)
- **Timeout**: 30 seconds per feed
- **Error Handling**: Continues processing other feeds if one fails

## API Endpoints

### 1. `/api/events`
**Method**: GET  
**Response**: 
```json
{
  "success": true,
  "count": 25,
  "events": [...],
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

### 2. `/.netlify/functions/manual-fetch-events`
**Method**: GET  
**Response**:
```json
{
  "success": true,
  "message": "Successfully processed iCalendar feeds",
  "results": [...],
  "processedFeeds": 5,
  "totalEvents": 25,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Benefits

### 1. **CORS Resolution**
- Server-to-server requests bypass browser CORS restrictions
- No proxy services required
- Reliable, consistent access to external feeds

### 2. **Performance**
- Single API request instead of multiple external requests
- Cached responses with 5-minute cache headers
- Faster loading for users

### 3. **Reliability**
- Automatic retry and error handling
- Graceful degradation if feeds fail
- Fallback to direct database queries

### 4. **Scalability**
- Scheduled processing prevents overwhelming external servers
- Batch processing for large datasets
- Efficient database operations

### 5. **Security**
- Server-side processing keeps external URLs secure
- Input validation and sanitization
- Controlled access to external resources

## Error Handling

### Feed-Level Errors
- Individual feed failures don't stop processing
- Detailed error logging for each feed
- Continues with remaining feeds

### API-Level Errors
- Fallback to direct database queries
- Graceful degradation
- User-friendly error messages

### Database Errors
- Transaction safety
- Rollback on critical failures
- Comprehensive error logging

## Monitoring

### Logging
- Detailed console logs for debugging
- Feed-by-feed processing results
- Performance metrics

### Admin Panel
- Manual trigger for testing
- Status monitoring
- Error reporting

## Deployment

### Netlify Functions
All functions are automatically deployed with the site:
- `scheduled-fetch-events.ts` - Scheduled processing
- `manual-fetch-events.ts` - Manual trigger
- `api-events.ts` - Local API endpoint

### Environment Variables
Required in Netlify:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for scheduled function)

## Testing

### Manual Testing
1. Visit `/.netlify/functions/manual-fetch-events` to trigger processing
2. Check `/api/events` to verify data is served correctly
3. Use admin panel "🔄 Refresh iCal Feeds" button

### Automated Testing
- Scheduled function runs automatically every 4 hours
- Monitor logs for successful processing
- Verify events appear in calendar interface

## Maintenance

### Adding New Feeds
1. Add feed configuration to `ICAL_FEEDS` array
2. Test with manual trigger function
3. Verify events appear in calendar
4. Monitor scheduled processing

### Updating Feed URLs
1. Update URLs in `ICAL_FEEDS` configuration
2. Test with manual trigger
3. Monitor for any errors

### Performance Optimization
- Monitor processing times
- Adjust batch sizes if needed
- Optimize database queries
- Consider caching strategies

## Troubleshooting

### Common Issues
1. **Feed URLs returning 404**: Update URLs or disable feeds
2. **Parsing errors**: Check iCalendar format validity
3. **Database errors**: Verify Supabase configuration
4. **Scheduled function not running**: Check Netlify function logs

### Debug Steps
1. Test manual trigger function
2. Check individual feed URLs
3. Verify database permissions
4. Monitor function logs

## Conclusion

This server-side architecture provides a robust, scalable solution for iCalendar integration that:
- Eliminates CORS issues completely
- Provides reliable, automated event aggregation
- Offers excellent performance and user experience
- Includes comprehensive error handling and monitoring
- Scales efficiently with additional feed sources

The system is production-ready and follows industry best practices for external data integration.
