# CSV Import Troubleshooting Guide

## Fixed Issues

The CSV bulk import feature has been improved to handle:
- ✅ Quoted fields with commas (e.g., `"Description with, commas"`)
- ✅ Multiple date formats (YYYY-MM-DD and MM/DD/YYYY)
- ✅ Windows and Unix line endings
- ✅ Better error messages with console logging

## Required CSV Format

Your CSV file must have these columns in this order:

```
Title,Date,Time,Location,Address,Category,Description
```

### Column Details

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| **Title** | ✅ Yes | Plain text | `Bonita Farmers Market` |
| **Date** | ✅ Yes | `YYYY-MM-DD` or `MM/DD/YYYY` | `2025-01-15` or `1/15/2025` |
| **Time** | Optional | `HH:MM` (24-hour) | `09:00` or `17:30` |
| **Location** | Optional | Plain text | `Bonita Community Park` |
| **Address** | Optional | Plain text | `3215 Bonita Rd, Bonita, CA 91902` |
| **Category** | Optional | Plain text | `Community`, `Business`, etc. |
| **Description** | Optional | Plain text | Any description text |

## Example CSV File

```csv
Title,Date,Time,Location,Address,Category,Description
Bonita Farmers Market,2025-01-15,09:00,Bonita Community Park,3215 Bonita Rd,Community,Weekly farmers market featuring local produce
Food Truck Friday,2025-01-12,17:00,Community Center,2900 Bonita Rd,Food & Entertainment,"Weekly food truck gathering with live music, games, and family fun"
```

**Note:** If your description contains commas, wrap it in quotes like the second example above.

## Common Issues and Solutions

### 1. "No valid events found in CSV file"

**Causes:**
- Missing required columns (Title or Date)
- Wrong date format
- CSV encoding issues
- File has no data rows

**Solutions:**
- ✅ Ensure first row has headers: `Title,Date,Time,Location,Address,Category,Description`
- ✅ Use date format `YYYY-MM-DD` (e.g., `2025-10-15`) or `MM/DD/YYYY` (e.g., `10/15/2025`)
- ✅ Save CSV as UTF-8 encoding
- ✅ Ensure you have at least one data row after the header

### 2. Missing Events After Import

**Check:**
- Open browser console (F12) and look for warning messages
- Each line that fails shows: `Skipping line X: [reason]`
- Common reasons:
  - Missing title or date
  - Invalid date format
  - Empty lines (these are skipped automatically)

### 3. Dates Not Parsing Correctly

**Date Format Requirements:**

✅ **Correct formats:**
- `2025-10-15` (YYYY-MM-DD)
- `10/15/2025` (MM/DD/YYYY)
- `1/15/2025` (M/D/YYYY)

❌ **Incorrect formats:**
- `15/10/2025` (DD/MM/YYYY - not supported)
- `Oct 15, 2025` (text month - not supported)
- `2025/10/15` (slashes with YYYY first - not supported)

### 4. Descriptions with Commas Get Cut Off

**Solution:** Wrap the field in double quotes:

```csv
Title,Date,Time,Location,Address,Category,Description
Event Name,2025-01-15,09:00,Location,Address,Category,"This description has, commas, in it"
```

### 5. Special Characters Not Showing

**Solution:** 
- Save your CSV as UTF-8 encoding
- In Excel: File → Save As → CSV UTF-8 (Comma delimited)
- In Google Sheets: File → Download → Comma Separated Values (.csv)

## Step-by-Step Import Process

1. **Prepare your CSV file:**
   - Use the template: `calendar-events-template.csv`
   - Ensure header row is present
   - Use correct date format (YYYY-MM-DD or MM/DD/YYYY)
   - Quote fields that contain commas

2. **Import in Admin Panel:**
   - Go to Admin page
   - Click "Bulk Import" button
   - Select your CSV file
   - Click "Upload"

3. **Check Results:**
   - Open browser console (F12) to see detailed logs
   - Look for messages like: `✓ Parsed line X: [Event Title]`
   - If any lines fail, console shows why

4. **Verify Import:**
   - Check the Calendar page to see your events
   - Events should appear with all details filled in

## Testing Your CSV

Before importing a large file, test with just 2-3 events:

```csv
Title,Date,Time,Location,Address,Category,Description
Test Event 1,2025-12-15,10:00,Test Location,123 Test St,Community,This is a test
Test Event 2,2025-12-20,14:30,Another Location,456 Test Ave,Business,Another test event
```

## Debugging Steps

If your import still fails:

1. **Open Browser Console** (Press F12)
2. **Try to import your CSV**
3. **Look for these messages:**
   - `Processing X lines from CSV...` - confirms file was read
   - `Skipping line X: [reason]` - shows why specific lines failed
   - `✓ Parsed line X: [title]` - confirms successful parsing
   - `Successfully parsed X events` - final count

4. **Common Console Messages:**

   ```
   Skipping line 2: Missing title or date. Fields: [...]
   → Check that row has both Title and Date filled in
   
   Skipping line 3 with invalid date: "01-15-2025"
   → Use format YYYY-MM-DD (2025-01-15) not DD-MM-YYYY
   
   Successfully parsed 0 events
   → All rows failed validation, check date format
   ```

## Getting Help

If you still have issues after trying the above:

1. Open browser console (F12)
2. Try the import
3. Copy all console messages
4. Check the specific error messages for each skipped line
5. Verify your CSV against the template file

## Template File

Use the provided `calendar-events-template.csv` file as a reference. It has:
- Correct header row
- Proper date format
- Example of quoted field with commas
- Multiple event types

## Advanced: Creating CSV from Excel

1. **Format dates as text first:**
   - Select date column
   - Format → Text
   - Enter dates as `2025-01-15`

2. **Save as CSV UTF-8:**
   - File → Save As
   - Choose "CSV UTF-8 (Comma delimited) (*.csv)"
   - Click Save

3. **Verify in text editor:**
   - Open the CSV in Notepad/TextEdit
   - Ensure dates look like: `2025-01-15`
   - Ensure no extra quotes or characters

## Advanced: Creating CSV from Google Sheets

1. **Format dates:**
   - Select date column
   - Format → Number → Plain text
   - Enter dates as `2025-01-15`

2. **Download:**
   - File → Download → Comma Separated Values (.csv)

3. **Import the downloaded file**

---

**Updated:** October 2025
**Improvements:** Better CSV parsing, multiple date formats, detailed error messages

