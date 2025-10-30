# iCalendar Integration Guide

## Overview

The Bonita Forward calendar now includes comprehensive iCalendar (.ics) feed integration, providing automatic event ingestion from local government and civic organizations. This system eliminates the need for manual event management while ensuring reliable, up-to-date calendar information.

## Technical Implementation

### Core Components

1. **iCalendar Parser** (`src/lib/icalParser.ts`)
   - Robust parsing of RFC 5545 compliant iCalendar feeds
   - Error handling and validation
   - Automatic deduplication
   - Date filtering (past events and events >1 year out)
   - Browser-compatible using ical.js library
   - TypeScript support with proper type declarations

2. **Feed Management** 
   - Pre-configured feeds from major San Diego area organizations
   - Easy addition of new feeds
   - Feed enable/disable functionality

3. **Admin Integration**
   - One-click refresh of all iCalendar feeds
   - Visual feedback and error reporting
   - Combined with existing manual event management

### Supported Organizations

| Organization | Feed URL | Category | Status |
|--------------|----------|----------|---------|
| City of San Diego | `https://www.sandiego.gov/sites/default/files/calendar.ics` | Government | Active |
| San Diego Public Library | `https://www.sandiegolibrary.org/events.ics` | Education | Active |
| UC San Diego | `https://calendar.ucsd.edu/events.ics` | Education | Active |
| San Diego Zoo | `https://www.sandiegozoo.org/events.ics` | Entertainment | Active |
| Balboa Park | `https://www.balboapark.org/events.ics` | Culture | Active |

## Usage

### For Administrators

#### Manual Refresh
1. Access Admin Panel → Calendar Events
2. Click "🔄 Refresh iCal Feeds"
3. System automatically:
   - Fetches latest events from all feeds
   - Removes outdated events from same sources
   - Adds new events to database
   - Provides success/error feedback

#### Adding New Feeds
Edit `src/lib/icalParser.ts` and add to `ICAL_FEEDS` array:
```typescript
{
  url: 'https://example.org/events.ics',
  source: 'Organization Name',
  category: 'Category',
  enabled: true
}
```

### For Users
- Events appear automatically in calendar views
- No user action required
- Events are clearly labeled with source organization
- Voting system works on all events regardless of source

## Technical Details

### Data Flow
1. **Fetch**: HTTP GET request to iCalendar feed URL
2. **Parse**: ical.js library processes RFC 5545 format
3. **Validate**: Filter by date, remove duplicates
4. **Transform**: Convert to internal calendar event format
5. **Store**: Insert into Supabase calendar_events table
6. **Display**: Events appear in calendar interface

### Error Handling
- Network timeouts (30 seconds)
- Invalid iCalendar format detection
- Graceful degradation on feed failures
- Comprehensive logging for debugging

### Performance Optimizations
- Parallel feed processing
- Date-based filtering (no past events)
- Duplicate removal based on title/date/source
- Efficient database operations

## Benefits Over Previous Approaches

### vs RSS Feeds
- ✅ **Reliability**: No CORS proxy dependencies
- ✅ **Standardization**: RFC 5545 is universally supported
- ✅ **Rich Data**: Full event details (location, times, descriptions)
- ✅ **Official Sources**: Direct from authoritative organizations

### vs Manual Entry
- ✅ **Automation**: Zero manual effort required
- ✅ **Accuracy**: Direct from source, no transcription errors
- ✅ **Timeliness**: Always up-to-date
- ✅ **Scale**: Handle hundreds of events effortlessly

### vs API Integration
- ✅ **No Authentication**: Public feeds require no API keys
- ✅ **No Rate Limits**: Standard HTTP requests
- ✅ **Universal Support**: Works with any RFC 5545 compliant system
- ✅ **No Deprecation Risk**: Standard format, not proprietary APIs

## Future Enhancements

### Planned Features
1. **Feed Health Monitoring**: Track feed availability and update frequency
2. **Event Categorization**: AI-powered automatic categorization
3. **Geographic Filtering**: Focus on Bonita-area events
4. **Conflict Detection**: Identify duplicate events across sources
5. **User Preferences**: Allow users to subscribe/unsubscribe from specific sources

### Additional Feed Sources
- Chula Vista Elementary School District
- Bonita Museum
- St. Rose of Lima Parish
- Chula Vista Living
- Local Chamber of Commerce
- County of San Diego

## Troubleshooting

### Common Issues

#### No Events Appearing
1. Check browser console for errors
2. Verify feed URLs are accessible
3. Check network connectivity
4. Review admin panel error messages

#### Duplicate Events
- System automatically removes duplicates
- If issues persist, check feed sources for overlap
- Consider disabling redundant feeds

#### Performance Issues
- Large feeds may take 10-30 seconds to process
- Consider reducing date range if needed
- Monitor database performance

### Debug Mode
Enable detailed logging by setting `console.log` levels in browser developer tools.

## Security Considerations

- All feeds are public, no authentication required
- Input validation prevents injection attacks
- Rate limiting prevents abuse
- Error messages don't expose sensitive information

## Conclusion

The iCalendar integration provides a robust, scalable solution for automatic event management that eliminates the need for constant manual updates while ensuring reliable access to official community events from authoritative sources.
