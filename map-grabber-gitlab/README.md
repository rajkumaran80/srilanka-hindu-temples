# 🕌 Urumpirai Hindu Temple Data Grabber

A powerful Node.js tool that automatically discovers, extracts, and organizes information about Hindu temples in Urumpirai using Google Maps API and Cloudinary for photo management.

## 🔍 Features

- **Automated Temple Discovery**: Searches Google Maps for Hindu temples in Urumpirai
- **Rich Metadata Extraction**:
  - Temple names
  - Precise latitude/longitude coordinates
  - Descriptions generated from ratings and reviews
  - Formatted addresses
- **Photo Management**: Downloads and uploads up to 3 photos per temple to Cloudinary
- **Database Integration**: Automatically saves temple data to MongoDB
- **Rate Limit Aware**: Respects Google Maps API limitations
- **Duplicate Prevention**: Skips existing temples to avoid duplicates

## 📋 Prerequisites

### Google Maps API Key
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Enable billing (required for quota)

### MongoDB Database
- Local MongoDB instance or cloud service (MongoDB Atlas)
- Database connection URI

### Cloudinary Account
1. Visit [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. Get your Cloud Name, API Key, and API Secret

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd map-grabber
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:
```env
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key

# MongoDB Database Configuration
MONGODB_URI=mongodb://localhost:27017/srilanka-temples

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🏃 Running the Tool

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode (single run)
```bash
npm start
```

## 📊 How It Works

1. **Search Phase**: Uses Google Places API to find Hindu temples within a 10km radius of Urumpirai center
2. **Detail Extraction**: Fetches detailed information for each temple including photos, ratings, and reviews
3. **Photo Processing**: Downloads up to 3 photos per temple and uploads them to Cloudinary
4. **Database Storage**: Saves structured temple data to MongoDB
5. **Progress Tracking**: Provides real-time console feedback throughout the process

## 📁 Data Structure

Each temple record includes:

```javascript
{
  name: "Thirukoneswaram Temple",
  latitude: 8.5772,
  longitude: 81.2194,
  description: "Ancient Hindu temple dedicated to Lord Shiva, situated on a hill overlooking the sea.",
  photos: [
    "https://res.cloudinary.com/.../thirukoneswaram-temple-1.jpg",
    "https://res.cloudinary.com/.../thirukoneswaram-temple-2.jpg",
    "https://res.cloudinary.com/.../thirukoneswaram-temple-3.jpg"
  ],
  location: "Thirukoneswaram, Trincomalee, Sri Lanka"
}
```

## ⚖️ Rate Limits & Considerations

### Google Maps API Limits
- **Places API**: 500 requests per day (free tier)
- **Place Details API**: 100 requests per day (free tier)
- **Static Map**: 100,000 requests per month (free tier)
- **Billing Required**: For higher limits

### Best Practices
- **Rate Limiting**: Built-in delays respect API limits
- **Error Handling**: Automatically handles API failures gracefully
- **Duplicate Prevention**: Checks existing records before saving
- **Cleanup**: Temporary files are automatically cleaned up

## 🔧 Configuration Options

The tool can be configured by modifying these parameters in `index.js`:

```javascript
// Search radius (in meters)
radius: 10000, // 10km

// Maximum temples to process
while (pageToken && temples.length < 50);

// Photos per temple
Math.min(3, place.photos.length)
```

## 🐛 Troubleshooting

### Common Issues

**"Must supply cloud_name" error:**
- Ensure Cloudinary credentials are correctly set in `.env`

**"API key not valid" error:**
- Verify Google Maps API key and ensure billing is enabled
- Check that required APIs are enabled in Google Cloud Console

**MongoDB connection error:**
- Ensure MongoDB is running locally or verify cloud connection string
- Check network connectivity for cloud databases

This tool will search for Hindu temples in Sri Lanka,
extract their information, gather photos, and update the database.
This tool will search for Hindu temples in Sri Lanka,
extract their information, gather photos, and update the database.

🔍 Starting temple data collection...
📊 Connected to MongoDB
✅ Processed: Sri Ponnambala Vanesar Kovil
📤 Uploading photo 1 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 1 for Sri Ponnambala Vanesar Kovil
 Uploading photo 2 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 2 for Sri Ponnambala Vanesar Kovil
📤 Uploading photo 3 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 3 for Sri Ponnambala Vanesar Kovil
💾 Saved: Sri Ponnambala Vanesar Kovil
📋 Found 47 temples
🎉 Temple data collection completed!
🔌 Disconnected from MongoDB
```
**No photos found:**
- Some temples may not have Google Photos available
- The tool will skip temples without photos

## 📈 Output Example

```
🕌 Urumpirai Hindu Temple Data Grabber
This tool will search for Hindu temples in Urumpirai,
extract their information, gather photos, and update the database.

🔍 Starting temple data collection...
📊 Connected to MongoDB
✅ Processed: Sri Ponnambala Vanesar Kovil
📤 Uploading photo 1 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 1 for Sri Ponnambala Vanesar Kovil
📤 Uploading photo 2 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 2 for Sri Ponnambala Vanesar Kovil
📤 Uploading photo 3 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 3 for Sri Ponnambala Vanesar Kovil
💾 Saved: Sri Ponnambala Vanesar Kovil
📋 Found 47 temples
🎉 Temple data collection completed!
🔌 Disconnected from MongoDB
```
=====================================
This tool will search for Hindu temples in Sri Lanka,
extract their information, gather photos, and update the database.

🔍 Starting temple data collection...
📊 Connected to MongoDB
✅ Processed: Sri Ponnambala Vanesar Kovil
📤 Uploading photo 1 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 1 for Sri Ponnambala Vanesar Kovil
� Uploading photo 2 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 2 for Sri Ponnambala Vanesar Kovil
📤 Uploading photo 3 for Sri Ponnambala Vanesar Kovil...
✅ Uploaded photo 3 for Sri Ponnambala Vanesar Kovil
💾 Saved: Sri Ponnambala Vanesar Kovil
📋 Found 47 temples
🎉 Temple data collection completed!
🔌 Disconnected from MongoDB
```

## 🔒 Security Notes

- **API Keys**: Never commit `.env` files to version control
- **Rate Limits**: Respect Google's terms of service and rate limits
- **Legal Usage**: Ensure compliance with Google Maps Platform Terms of Service
- **IP Restrictions**: Consider restricting API keys to specific IP addresses

## 📝 License

This tool is provided as-is for educational and development purposes. Please respect all API terms of service and usage policies from Google, Cloudinary, and MongoDB.
