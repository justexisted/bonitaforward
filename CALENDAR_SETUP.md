# Bonita Calendar Setup Guide

## Overview
The Bonita Calendar automatically fetches events from zip code 91902 (Bonita, CA) and allows users to vote on events to determine their visibility and priority placement.

## Features
- **Database-Driven Events**: Events stored in and loaded from the database
- **Sample Events**: Includes realistic Bonita community events for demonstration
- **Community Voting**: Users can upvote/downvote events
- **Community Voting**: Users can upvote/downvote events
- **Priority Placement**: Events are sorted by vote score (upvotes - downvotes)
- **Real-time Updates**: Vote counts update immediately
- **Authentication Integration**: Voting requires user sign-in

## Database Setup

### 1. Run the SQL Script
Execute the SQL script to create the required database tables:

```bash
# Connect to your Supabase database and run:
psql -h your-db-host -U postgres -d postgres -f scripts/create-calendar-tables.sql
```

Or run it directly in the Supabase SQL editor.

### 2. Tables Created
- `calendar_events`: Stores event information
- `event_votes`: Stores user votes on events
- Automatic triggers update vote counts when votes change

### 3. Row Level Security (RLS)
- Events are publicly readable
- Only admins can create/edit/delete events
- Authenticated users can vote on events

## Environment Variables

### Note: Eventbrite API Limitation
Eventbrite deprecated their public events search API in 2019. The calendar now uses comprehensive local Bonita events instead of external API integration.

## Usage

### For Users
1. Navigate to `/calendar`
2. Browse events from Bonita (91902)
3. Sign in to vote on events
4. Upvote events you want to see more of
5. Downvote events that don't interest you
6. Events are automatically sorted by popularity

### For Admins
1. Access the admin panel
2. Select "Calendar Events" from the dropdown
3. **Single Event**: Click "+ Add Single Event" for individual events
4. **Bulk Import**: Click "📥 Bulk Import CSV" to import multiple events
5. **Quick Setup**: Click "🏘️ Add Bonita Events" for sample events
6. **Management**: Delete events as needed

### Bulk Import Format
Use CSV format for bulk importing events:
```
Title,Date,Time,Location,Address,Category,Description
Farmers Market,2024-01-15,09:00,Bonita Park,3215 Bonita Rd,Community,Weekly market
Story Time,2024-01-12,10:30,Library,4375 Bonita Rd,Family,Children's program
```

**Required Fields**: Title, Date
**Optional Fields**: Time (defaults to 12:00), Location, Address, Category (defaults to Community), Description
**Date Format**: YYYY-MM-DD
**Time Format**: HH:MM (24-hour)

## Event Sources

### Current Integrations
- **Database Events**: Manually added events through admin panel
- **Sample Events**: Realistic Bonita community events for demonstration
- **Community Submissions**: Events added by community members

### Real Events System
The calendar supports real Bonita community events through:
- **Admin Panel**: Add/edit/delete events through the admin interface
- **Bulk Import**: Import multiple events via CSV format
- **Database Storage**: All events stored in Supabase calendar_events table
- **No RSS Dependencies**: No external feeds that can fail or break

### Future Integrations
- RSS feed integration for San Diego government calendars
- Chamber of Commerce event feeds
- Local business event calendars
- Additional community event sources

## Voting System

### How It Works
1. **Vote Score**: `upvotes - downvotes`
2. **Priority**: Higher scores appear first
3. **User Limits**: One vote per user per event
4. **Vote Changes**: Users can change their vote
5. **Vote Removal**: Users can remove their vote

### Example Event Sorting
```
Event A: 15 upvotes, 2 downvotes = Score: 13
Event B: 8 upvotes, 1 downvote = Score: 7
Event C: 5 upvotes, 5 downvotes = Score: 0
Event D: 2 upvotes, 8 downvotes = Score: -6
```

## Adding Events
Events can be added through the admin panel or directly to the database. The calendar will display all events from the `calendar_events` table.

## Customization

### Adding New Event Sources
1. Modify the `fetchExternalEvents()` function in `Calendar.tsx`
2. Add new API integrations
3. Map external data to `CalendarEvent` type

### Styling
- Uses Tailwind CSS classes
- Signika font for headings
- Responsive design for mobile/desktop
- Hover effects and transitions

## Security Considerations
- All database operations use RLS policies
- User votes are tied to authenticated users
- Admin-only event management
- Input sanitization for external API data

## Performance
- Events are cached in component state
- Vote updates are optimistic (immediate UI update)
- Database triggers handle vote count updates
- Efficient sorting by vote score and date
