/*
TypeScript script: for each temple in srilanka-hindu-temples db, find matching temple in hindu-temples db by coordinates.
Exact match first, then within 10m radius. If matched, add location and temple_name; else delete them.

Instructions (set these env vars before running):
- MONGODB_URI  -> MongoDB connection string
- MONGODB_DB   -> srilanka-hindu-temples
- HINDU_TEMPLE_DB -> hindu-temples
- MONGODB_COLLECTION -> temples

Run: `npx tsx src/temple-name-updater.ts`

Notes:
- Processes all temples in srilanka-hindu-temples
- Searches hindu-temples for exact lat/lon match, then within 10m
- Updates with temple_name and location if found, else unsets them
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

// Function to clean location by removing Google Plus code prefix
function cleanLocation(location: string): string {
  // Remove Google Plus code like 'P49G+2PH ' or similar
  const plusCodeRegex = /^[A-Z0-9]{4}\+[A-Z0-9]{3,4}\s*,?\s*/;
  return location.replace(plusCodeRegex, '').trim();
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

// Main runner
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const sriDb = client.db(MONGODB_DB);
  const sriCol = sriDb.collection(MONGODB_COLLECTION);

  // Process all temples
  const cursor = sriCol.find({});

  let updatedCount = 0;
  let unsetCount = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;

    const lat = doc.latitude;
    const lon = doc.longitude;
    console.log(`Processing temple: ${doc.name} at ${lat}, ${lon}`);

    const matchingTemple = await findMatchingTemple(client, lat, lon);
    if (matchingTemple) {
      const templeName = matchingTemple.name || matchingTemple.temple_name;
      let location = matchingTemple.location || matchingTemple.address;
      if (location && typeof location === 'string') {
        location = cleanLocation(location);
      }

      const update = {
        $set: {
          temple_name: templeName,
          location: location
        }
      };

      await sriCol.updateOne({ _id: doc._id }, update);
      console.log(`Updated with name: ${templeName}, location: ${location}`);
      updatedCount++;
    } else {
      // Unset temple_name and location
      const update = {
        $unset: {
          temple_name: '',
          location: ''
        }
      };
      await sriCol.updateOne({ _id: doc._id }, update);
      console.log('Unset temple_name and location');
      unsetCount++;
    }

    // Small delay to avoid overwhelming DB
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Updated ${updatedCount} temples, unset ${unsetCount} temples`);
  await client.close();
}

// Execute
main().catch(err => { console.error(err); process.exit(1); });
