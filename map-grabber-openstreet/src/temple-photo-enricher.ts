/*
TypeScript script: for each temple in srilanka-hindu-temples db, find matching temple in hindu-temples db by coordinates.
Exact match first, then within 10m radius. If matched, fetch photos, upload to Azure, and update temple with Azure links.

Instructions (set these env vars before running):
- MONGODB_URI  -> MongoDB connection string
- MONGODB_DB   -> srilanka-hindu-temples
- HINDU_TEMPLE_DB -> hindu-temples
- MONGODB_COLLECTION -> temples

Run: `npx tsx src/temple-photo-enricher.ts`

Notes:
- Processes all temples in srilanka-hindu-temples
- Searches hindu-temples for exact lat/lon match, then within 10m
- If matched, fetches photos (URLs), uploads to Azure via backend API, updates temple with Azure URLs
- Backend must be running on localhost:8080
*/

import { MongoClient, WithId, Document } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// --- Configuration from env ---
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'srilanka-hindu-temples';
const HINDU_TEMPLE_DB = process.env.HINDU_TEMPLE_DB || 'hindu-temples';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'temples';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Set it and re-run.');
  process.exit(1);
}

// Function to find matching temple in hindu-temples db
async function findMatchingTemple(client: MongoClient, lat: number, lon: number) {
  const hinduDb = client.db(HINDU_TEMPLE_DB);
  const hinduCol = hinduDb.collection('temples');

  // First, exact match
  const exact = await hinduCol.findOne({ latitude: lat, longitude: lon });
  if (exact) return exact;

  // Then, within 10m radius (approx 0.0001 degrees)
  const radius = 0.0001;
  const query = {
    latitude: { $gte: lat - radius, $lte: lat + radius },
    longitude: { $gte: lon - radius, $lte: lon + radius }
  };

  const temples = await hinduCol.find(query).toArray();
  if (temples.length > 0) {
    // Find the closest one
    let closest = temples[0];
    let minDist = Infinity;
    for (const t of temples) {
      const dist = Math.sqrt((t.latitude - lat) ** 2 + (t.longitude - lon) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = t;
      }
    }
    return closest;
  }
  return null;
}

// Function to upload photo to Azure via backend API
async function uploadPhotoToAzure(templeId: string, photoUrl: string): Promise<string | null> {
  try {
    // Fetch the photo
    const response = await fetch(photoUrl);
    if (!response.ok) {
      console.error(`Failed to fetch photo from ${photoUrl}: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Determine file type
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(`Uploading photo for temple ${templeId} from ${photoUrl}`);

    // Upload via presigned_upload_photo.ts with fileData
    const uploadResponse = await fetch('http://localhost:8080/api/presigned_upload_photo.ts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templeId,
        fileType: contentType,
        fileData: base64,
      }),
    });

    console.log(`Upload response status: ${uploadResponse.status}`);

    if (!uploadResponse.ok) {
      console.error(`Failed to upload photo: ${uploadResponse.status} ${uploadResponse.statusText}`);
      return null;
    }

    const uploadResult = await uploadResponse.json();
    if (!uploadResult.ok) {
      console.error(`Upload failed: ${uploadResult.error}`);
      return null;
    }

    return uploadResult.url;
  } catch (error) {
    console.error(`Error uploading photo ${photoUrl}:`, error);
    return null;
  }
}

// Function to add approved photo to temple
async function addApprovedPhoto(templeId: string, photoUrl: string): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8080/api/add_approved_photo.ts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templeId,
        photoName: photoUrl,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to add approved photo: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    return result.success || false;
  } catch (error) {
    console.error(`Error adding approved photo:`, error);
    return false;
  }
}

// Main runner
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const sriDb = client.db(MONGODB_DB);
  const sriCol = sriDb.collection(MONGODB_COLLECTION);

  // Process all temples
  const cursor = sriCol.find({});

  let updatedCount = 0;
  let photoUploadCount = 0;
  let unsetCount = 0;
  while (await cursor.hasNext()) {

    try {
      const doc = await cursor.next();
      if (!doc) continue;

      const lat = doc.latitude;
      const lon = doc.longitude;
      const templeId = doc._id.toString();
      console.log(`Processing temple: ${doc.name} at ${lat}, ${lon}`);

      if (doc.photos && Array.isArray(doc.photos) && doc.photos.length > 0) {
        console.log(`Temple already has photos, skipping.`);
        continue;
      }

      if (!doc.temple_name && doc.name.startsWith('unnamed_temple')) {
        continue;
      }

      const matchingTemple = await findMatchingTemple(client, lat, lon);
      if (matchingTemple && matchingTemple.photos && Array.isArray(matchingTemple.photos)) {
        const templeName = matchingTemple.name;

        // Update temple name
        await sriCol.updateOne({ _id: doc._id }, {
          $set: { temple_name: templeName }
        });

        // Upload photos
        const azureUrls: string[] = [];
        for (const photoUrl of matchingTemple.photos) {
          console.log(`Uploading photo: ${photoUrl}`);
          const azureUrl = await uploadPhotoToAzure(templeId, photoUrl);
          if (azureUrl) {
            const added = await addApprovedPhoto(templeId, azureUrl);
            if (added) {
              azureUrls.push(azureUrl);
              photoUploadCount++;
              console.log(`Uploaded and added photo: ${azureUrl}`);
            }
          }
          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`Updated temple with name: ${templeName}, uploaded ${azureUrls.length} photos`);
        updatedCount++;
      }

      // Small delay to avoid overwhelming DB
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error('Error processing temple:', err);
      continue;
    }
  }

  console.log(`Updated ${updatedCount} temples, uploaded ${photoUploadCount} photos, unset ${unsetCount} temples`);
  await client.close();
}

// Execute
main().catch(err => { console.error(err); process.exit(1); });
