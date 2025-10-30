const axios = require('axios');
const { Client } = require('@googlemaps/google-maps-services-js');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize clients
const googleMapsClient = new Client({});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Temple Schema (similar to the one in backend)
const templeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String, required: true },
  photos: [{ type: String }],
  location: { type: String, required: true }
});

const Temple = mongoose.model('Temple', templeSchema);

// Main function
async function grabTempleData() {
  try {
    console.log('🔍 Starting temple data collection...');

    // Validate required environment variables
    if (!process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY === 'your_actual_google_maps_api_key') {
      console.error('❌ GOOGLE_MAPS_API_KEY is not set or using placeholder value');
      console.error('Please set your Google Maps API key in the .env file');
      console.error('1. Go to https://console.cloud.google.com/');
      console.error('2. Enable Places API and Maps JavaScript API');
      console.error('3. Create an API key with billing enabled');
      process.exit(1);
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
      console.error('❌ Cloudinary credentials are not set properly');
      console.error('Please set your Cloudinary credentials in the .env file');
      console.error('1. Go to https://cloudinary.com/');
      console.error('2. Create a free account');
      console.error('3. Get your Cloud Name, API Key, and API Secret');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/srilanka-temples');
    console.log('📊 Connected to MongoDB');

    // Test API key before proceeding
    try {
      console.log('🔧 Testing Google Maps API key...');
      await googleMapsClient.placesNearby({
        params: {
          location: { lat: 9.7003, lng: 80.0197 },
          radius: 1000, // Small radius test
          key: process.env.GOOGLE_MAPS_API_KEY
        },
        timeout: 10000
      });
      console.log('✅ Google Maps API key is valid');
    } catch (apiError) {
      console.error('❌ Google Maps API key test failed:', apiError.message);
      console.error('');
      console.error('🔧 Troubleshooting:');
      console.error('1. Verify the API key is correct');
      console.error('2. Enable Places API and Maps JavaScript API in Google Cloud Console');
      console.error('3. Enable billing account on your Google Cloud project');
      console.error('4. Check if API key has restrictions (IP, referrer)');
      console.error('');
      process.exit(1);
    }

    // Search for Hindu temples in Urumpirai
    const temples = [];
    let pageToken = null;

    do {
      try {
        console.log(`🔍 Searching for temples (page ${Math.ceil(temples.length / 20) + 1})...`);
        const searchResponse = await googleMapsClient
          .placesNearby({
            params: {
              location: { lat: 9.7003, lng: 80.0197 }, // Center of Urumpirai
              radius: 10000, // 10km radius to cover Urumpirai area
              keyword: 'hindu temple',
              key: process.env.GOOGLE_MAPS_API_KEY,
              pagetoken: pageToken
            },
            timeout: 10000
          });

        console.log(`📊 API Response: Found ${searchResponse.data.results?.length || 0} results`);

        const results = searchResponse.data.results;
        console.log(results);

        // Log first few results for debugging
        if (results.length > 0) {
          console.log('📍 Sample results:');
          for (let i = 0; i < Math.min(3, results.length); i++) {
            console.log(`  - ${results[i].name} (${results[i].types?.join(', ')})`);
          }
        } else {
          console.log('❌ No places found in the search area.');
        }

        for (const place of results) {
          try {
            const templeData = await processTempleDetails(place.place_id);
            if (templeData) {
              temples.push(templeData);
              console.log(`✅ Processed: ${templeData.name}`);
            } else {
              console.log(`⚠️  Skipped: ${place.name} (no valid data)`);
            }
          } catch (error) {
            console.error(`❌ Error processing ${place.name}:`, error.message);
          }

          // Wait longer to respect rate limits
          await sleep(500);
        }

        pageToken = searchResponse.data.next_page_token;

        // Wait before next page to respect Google's rate limits
        if (pageToken) {
          console.log('⏳ Waiting for next page...');
          await sleep(2000);
        }
      } catch (error) {
        console.error('❌ Error in search:', error.message);
        break;
      }
    } while (pageToken && temples.length < 50); // Limit to 50 temples

    console.log(`📋 Found ${temples.length} temples`);

    // Save to database
    for (const temple of temples) {
      try {
        const existingTemple = await Temple.findOne({ name: temple.name });
        if (!existingTemple) {
          await Temple.create(temple);
          console.log(`💾 Saved: ${temple.name}`);
        } else {
          console.log(`⏭️  Skipped (already exists): ${temple.name}`);
        }
      } catch (error) {
        console.error(`❌ Error saving ${temple.name}:`, error.message);
      }
    }

    console.log('🎉 Temple data collection completed!');

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Process individual temple details
async function processTempleDetails(placeId) {
  try {
    // Get place details including photos
    const detailsResponse = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['name', 'geometry', 'formatted_address', 'photos', 'types', 'rating', 'reviews'],
        key: process.env.GOOGLE_MAPS_API_KEY
      },
      timeout: 10000
    });

    const place = detailsResponse.data.result;

    if (!place.name || !place.geometry?.location) {
      console.log(`⚠️  Skipping ${placeId} - incomplete data`);
      return null;
    }

    // Generate description from available data
    let description = `${place.name} is a sacred Hindu temple located in Urumpirai.`;

    if (place.rating) {
      description += ` It has a rating of ${place.rating} stars.`;
    }

    if (place.reviews && place.reviews.length > 0) {
      const review = place.reviews[0].text;
      if (review) {
        description += ` Visitors describe it as: "${review.substring(0, 100)}..."`;
      }
    }

    // Get photos from Google Places
    const photos = [];
    if (place.photos && place.photos.length > 0) {
      for (let i = 0; i < Math.min(3, place.photos.length); i++) {
        try {
          const photoUrl = getPhotoUrl(place.photos[i].photo_reference, process.env.GOOGLE_MAPS_API_KEY);

          // Download and upload to Cloudinary
          const uploadedUrl = await uploadImageToCloudinary(photoUrl, place.name, i + 1);
          if (uploadedUrl) {
            photos.push(uploadedUrl);
          }
        } catch (error) {
          console.error(`❌ Failed to process photo for ${place.name}:`, error.message);
        }
      }
    }

    // If no photos from Google Places, try to get some alternative photos
    // (This is a simplified version - in practice you'd want more sophisticated photo finding)
    if (photos.length === 0) {
      console.log(`⚠️  No photos found for ${place.name}, skipping...`);
      return null; // Skip temples without photos
    }

    return {
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      description: description,
      photos: photos,
      location: place.formatted_address || 'Urumpirai'
    };

  } catch (error) {
    console.error(`❌ Error getting details for ${placeId}:`, error.message);
    return null;
  }
}

// Generate Google Places photo URL
function getPhotoUrl(photoReference, apiKey, maxwidth = 800) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoReference}&key=${apiKey}`;
}

// Upload image to Cloudinary
async function uploadImageToCloudinary(imageUrl, templeName, photoNumber) {
  try {
    console.log(`📤 Uploading photo ${photoNumber} for ${templeName}...`);

    console.log(imageUrl);

    // Download image first
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    // Create temporary file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const tempFileName = `${templeName.replace(/[^a-zA-Z0-9]/g, '_')}-${photoNumber}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);

    fs.writeFileSync(tempFilePath, Buffer.from(response.data));

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, {
      folder: 'srilanka-temples',
      public_id: `${templeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}-temple-${photoNumber}`,
      overwrite: true
    });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    console.log(`✅ Uploaded photo ${photoNumber} for ${templeName}`);
    return result.secure_url;

  } catch (error) {
    console.error(`❌ Failed to upload photo:`, error.message);
    return null;
  }
}

// Utility function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
if (require.main === module) {
  console.log('🕌 Urumpirai Hindu Temple Data Grabber');
  console.log('=====================================');
  console.log('This tool will search for Hindu temples in Urumpirai,');
  console.log('extract their information, gather photos, and update the database.');
  console.log('');

  grabTempleData();
}

module.exports = { grabTempleData };
