import { config } from 'dotenv';
import { MongoClient, ObjectId, Db } from "mongodb";

// Load environment variables
config();

// Define interfaces
interface TempleDocument {
  _id: ObjectId;
  osm_id?: number;
  latitude?: number;
  longitude?: number;
  name?: string;
  temple_name?: string;
  level?: number;
  [key: string]: any;
}

// Global variables
const MONGODB_URI: string = process.env.MONGODB_URI!;
const DATABASE: string = process.env.MONGODB_DB!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGO_URI or MONGODB_URI environment variable inside .env or Vercel environment variables');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase() {
  console.log('Connecting to database...');

  if (cachedClient && cachedDb) {
    console.log('Using cached MongoDB connection');
    return { client: cachedClient, db: cachedDb };
  }

  console.log('Creating new MongoDB connection');

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log('Attempting to connect to MongoDB...');
  await client.connect();
  console.log('MongoDB connection established');

  const db = client.db(DATABASE);
  console.log(`Using database: ${DATABASE}`);

  cachedClient = client;
  cachedDb = db;

  console.log('Connection cached for reuse');
  return { client, db };
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Check if a temple is too close to other temples with the same level
function isTooClose(temple: TempleDocument, otherTemples: TempleDocument[], minDistanceKm: number = 5): boolean {
  if (!temple.latitude || !temple.longitude) return false;

  for (const otherTemple of otherTemples) {
    if (!otherTemple.latitude || !otherTemple.longitude) continue;
    if (otherTemple.level !== temple.level) continue;

    const distance = calculateDistance(
      temple.latitude,
      temple.longitude,
      otherTemple.latitude,
      otherTemple.longitude
    );

    if (distance < minDistanceKm) {
      return true;
    }
  }

  return false;
}

// Distribute level 3 temples across levels 3-8 with spatial constraints
async function distributeLevel3Temples() {
  console.log('Starting level 3 temple distribution...');

  try {
    const { db } = await connectToDatabase();

    // Get all temples with level 3
    console.log('Fetching temples with level 3...');
    const level3Temples = await db.collection<TempleDocument>("temples")
      .find({ level: 3 })
      .toArray();

    console.log(`Found ${level3Temples.length} temples with level 3`);

    if (level3Temples.length === 0) {
      console.log('No temples with level 3 found. Nothing to distribute.');
      return;
    }

    // Get all temples (for distance checking)
    console.log('Fetching all temples for distance calculations...');
    const allTemples = await db.collection<TempleDocument>("temples")
      .find({})
      .toArray();

    console.log(`Loaded ${allTemples.length} total temples for distance checking`);

    // Available levels: 3, 4, 5, 6, 7, 8
    const targetLevels = [3, 4, 5, 6, 7, 8];
    const templesPerLevel = Math.floor(level3Temples.length / targetLevels.length);
    const remainder = level3Temples.length % targetLevels.length;

    console.log(`Distributing ${level3Temples.length} temples across ${targetLevels.length} levels`);
    console.log(`${templesPerLevel} temples per level, ${remainder} remainder`);

    // Create distribution plan
    const distributionPlan: { [level: number]: TempleDocument[] } = {};
    targetLevels.forEach(level => {
      distributionPlan[level] = [];
    });

    // Simple round-robin distribution across levels 3-8
    console.log('Performing simple round-robin distribution...');

    for (let i = 0; i < level3Temples.length; i++) {
      const temple = level3Temples[i];
      const targetLevel = targetLevels[i % targetLevels.length];
      distributionPlan[targetLevel].push(temple);
    }

    // Log the distribution
    console.log('\n=== ROUND-ROBIN DISTRIBUTION ===');
    for (const [level, temples] of Object.entries(distributionPlan)) {
      console.log(`Level ${level}: ${temples.length} temples`);
    }

    // Update the database with new levels
    console.log('\nUpdating temple levels in database...');

    let totalUpdated = 0;
    for (const [level, temples] of Object.entries(distributionPlan)) {
      const levelNum = parseInt(level);

      for (const temple of temples) {
        const result = await db.collection("temples").updateOne(
          { _id: temple._id },
          { $set: { level: levelNum } }
        );

        if (result.modifiedCount > 0) {
          totalUpdated++;
          console.log(`Updated temple "${temple.name || temple.temple_name || 'Unnamed'}" to level ${levelNum}`);
        }
      }
    }

    // Print summary
    console.log('\n=== DISTRIBUTION SUMMARY ===');
    for (const [level, temples] of Object.entries(distributionPlan)) {
      console.log(`Level ${level}: ${temples.length} temples`);
    }
    console.log(`Total temples updated: ${totalUpdated}`);

    // Verify distribution
    console.log('\nVerifying final distribution...');
    const finalCounts = await db.collection("temples").aggregate([
      { $match: { level: { $in: targetLevels } } },
      { $group: { _id: "$level", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('Final level counts:');
    finalCounts.forEach((count: any) => {
      console.log(`  Level ${count._id}: ${count.count} temples`);
    });

    console.log('\nLevel 3 temple distribution completed successfully!');

  } catch (error) {
    console.error('Error distributing level 3 temples:', error);
    throw error;
  }
}

// Run the distribution
distributeLevel3Temples()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
