# CSV Image Import Instructions

## 🎯 **Problem Solved**
Your CSV files didn't import images because Supabase expects image arrays in JSON format like `["image1.jpg", "image2.jpg"]`, but CSV typically stores them as comma-separated strings.

## 📁 **Where to Put Your CSV Files**
Put your CSV files in the project root directory (same level as `package.json`).

## 🚀 **How to Import Images**

### Option 1: Automatic CSV Processing (Recommended)

1. **Put your CSV file(s) in the project root**
2. **Run the processing script:**
   ```bash
   npx tsx scripts/process-csv-images.ts your-file.csv
   ```
   
   Or for multiple files:
   ```bash
   npx tsx scripts/process-csv-images.ts file1.csv file2.csv file3.csv
   ```

### Option 2: Manual Image Updates

1. **Edit the script** `scripts/update-provider-images.ts`
2. **Add your image mappings** to the `imageMappings` object:
   ```typescript
   const imageMappings: Record<string, string[]> = {
     'Your Business Name': ['image1.jpg', 'image2.jpg'],
     'Another Business': ['photo1.png', 'photo2.jpg'],
   }
   ```
3. **Run the update script:**
   ```bash
   npx tsx scripts/update-provider-images.ts update
   ```

## 🔍 **Supported Image Formats**

The CSV processor handles these formats:
- **JSON arrays:** `["image1.jpg", "image2.jpg"]`
- **Comma-separated:** `image1.jpg, image2.jpg`
- **Pipe-separated:** `image1.jpg|image2.jpg`
- **Semicolon-separated:** `image1.jpg;image2.jpg`

## 📋 **Before You Start**

1. **List your current providers:**
   ```bash
   npx tsx scripts/update-provider-images.ts list
   ```

2. **Check your CSV structure** - the script will show you what columns it finds

## 🛠️ **What the Scripts Do**

### `process-csv-images.ts`
- Reads your CSV file
- Finds image columns (any column with "image", "photo", or "picture" in the name)
- Converts different image formats to proper JSON arrays
- Updates providers in the database with the correct image arrays

### `update-provider-images.ts`
- Allows manual image updates
- Lists all providers in your database
- Updates specific providers with predefined image mappings

## 🎯 **Expected CSV Structure**

Your CSV should have columns like:
```csv
name,business_name,images,photos
"Business Name","Business Name","image1.jpg,image2.jpg","photo1.png"
```

The script will automatically find columns containing images and process them.

## ✅ **After Running**

1. **Check your database** - providers should now have images
2. **Visit your app** - images should load properly
3. **Check console logs** - you'll see detailed progress

## 🆘 **Need Help?**

If you have issues:
1. Share your CSV file (you can put it in the project root)
2. Run the list command to see current providers
3. Check the console output for any errors

The scripts are designed to be safe - they won't delete existing data, only update image fields.
