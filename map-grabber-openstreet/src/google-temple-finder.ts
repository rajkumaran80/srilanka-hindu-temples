/*
TypeScript script: Find unnamed temples and use Google search to identify them and download photos.

Instructions:
- Reads temples from srilanka-hindu-temples db where name starts with 'unnamed' and temple_name is null
- Uses Google Places API or web search to find temple names from coordinates
- Downloads photos and saves them in folders named after the temple

Run: `npx tsx src/google-temple-finder.ts`

Notes:
- Requires Google Places API key for accurate results
- Downloads photos to local folders
- Updates temple records with found names
*/

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// --- Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'srilanka-hindu-temples';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'temples';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Set it and re-run.');
  process.exit(1);
}

if (!GOOGLE_PLACES_API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY is required for Google Places API. Set it and re-run.');
  process.exit(1);
}

// Create photos directory if it doesn't exist
const PHOTOS_DIR = path.join(process.cwd(), 'temple_photos_google');
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

// Function to search Google Places API for temples near coordinates
async function searchNearbyTemples(lat: number, lon: number): Promise<any[]> {
  try {
    const radius = 100; //  100m (more practical)
    const type = "place_of_worship";
    const keyword = "hindu";

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=${type}&keyword=${keyword}&key=${GOOGLE_PLACES_API_KEY}`;

    //console.log(`Searching Google Places for temples near ${lat}, ${lon}, ${url}`);

    const response = await axios.get(url);
    return response.data.results || [];

  } catch (error) {
    console.error("Error searching Google Places:", error);
    return [];
  }
}

// Function to get place details including photos
async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${GOOGLE_PLACES_API_KEY}`;
    const response = await axios.get(url);
    return response.data.result;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

// Function to download photo from Google Places
async function downloadPhoto(photoReference: string, templeName: string, index: number): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;

    // Create temple folder
    const templeFolder = path.join(PHOTOS_DIR, templeName.replace(/[^a-zA-Z0-9]/g, '_'));
    if (!fs.existsSync(templeFolder)) {
      fs.mkdirSync(templeFolder, { recursive: true });
    }

    const filename = `${templeName.replace(/[^a-zA-Z0-9]/g, '_')}_${index + 1}.jpg`;
    const filepath = path.join(templeFolder, filename);

    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filepath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading photo:', error);
    return null;
  }
}

// Main runner
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const collection = db.collection(MONGODB_COLLECTION);

  // Find temples with name equals 'Hindu Temple'
  const query = {
    name: { $regex: /^Hindu Temple$/i }
  };

  const cursor = collection.find(query);
  let processedCount = 0;
  let updatedCount = 0;

  while (await cursor.hasNext()) {
    const temple = await cursor.next();
    if (!temple) continue;

    const lat = temple.latitude;
    const lon = temple.longitude;

    console.log(`Processing unnamed temple at ${lat}, ${lon}`);

    // Search for nearby temples
    const nearbyTemples = await searchNearbyTemples(lat, lon);

    if (nearbyTemples.length > 0) {
      // Take the first (closest) result
      const foundTemple = nearbyTemples[0];
      const templeName = foundTemple.name;

      console.log(`Found temple: ${templeName}`);

      // Get place details including photos
      const placeDetails = await getPlaceDetails(foundTemple.place_id);

    //   if (placeDetails && placeDetails.photos && placeDetails.photos.length > 0) {
    //     console.log(`Downloading ${placeDetails.photos.length} photos...`);

    //     // Download up to 5 photos
    //     const downloadPromises = placeDetails.photos.slice(0, 5).map((photo: any, index: number) =>
    //       downloadPhoto(photo.photo_reference, templeName, index)
    //     );

    //     const downloadedPaths = await Promise.all(downloadPromises);
    //     const successfulDownloads = downloadedPaths.filter(path => path !== null);

    //     console.log(`Downloaded ${successfulDownloads.length} photos to ${path.join(PHOTOS_DIR, templeName.replace(/[^a-zA-Z0-9]/g, '_'))}`);
    //   }

      // Update the temple record with the found name
      const update = {
        $set: {
          temple_name: templeName,
          google_place_id: foundTemple.place_id,
          google_rating: foundTemple.rating,
          google_photos_count: placeDetails?.photos?.length || 0
        }
      };

      await collection.updateOne({ _id: temple._id }, update);
      console.log(`Updated temple with name: ${templeName}`);
      updatedCount++;
    } else {
      console.log('No nearby temples found');
    }

    processedCount++;

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for API rate limits
  }

  console.log(`Processed ${processedCount} temples, updated ${updatedCount} with names and photos`);
  await client.close();
}

// Execute
main().catch(err => { console.error(err); process.exit(1); });
