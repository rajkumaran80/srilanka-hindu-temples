import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Temple {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
  level: number;
  location?: string;
}

async function updateJaffnaTempleLevels() {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'srilanka-hindu-temples';

  console.log('🔄 Connecting to MongoDB...');

  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const templesCollection = db.collection<Temple>('temples');

    // Jaffna town coordinates (approximately)
    const jaffnaCenter = {
      lat: 9.6615,
      lng: 80.0255
    };

    // Search radius: ~5km around Jaffna town
    const searchRadiusKm = 5;
    const searchRadiusDegrees = searchRadiusKm / 111.32; // Rough conversion

    console.log(`🔍 Finding temples within ${searchRadiusKm}km of Jaffna town (${jaffnaCenter.lat}, ${jaffnaCenter.lng})`);

    // Find temples within the radius that are currently level 3
    const templesNearJaffna = await templesCollection.find({
      latitude: {
        $gte: jaffnaCenter.lat - searchRadiusDegrees,
        $lte: jaffnaCenter.lat + searchRadiusDegrees
      },
      longitude: {
        $gte: jaffnaCenter.lng - searchRadiusDegrees,
        $lte: jaffnaCenter.lng + searchRadiusDegrees
      },
      level: 3,
      name: { $not: { $regex: '^unnamed', $options: 'i' } }
    }).toArray();

    console.log(`📍 Found ${templesNearJaffna.length} level 3 temples near Jaffna`);

    if (templesNearJaffna.length === 0) {
      console.log('ℹ️ No level 3 temples found in the area');
      return;
    }

    // Calculate distance from center and sort by distance
    const templesWithDistance = templesNearJaffna.map(temple => ({
      ...temple,
      distance: Math.sqrt(
        Math.pow(temple.latitude - jaffnaCenter.lat, 2) +
        Math.pow(temple.longitude - jaffnaCenter.lng, 2)
      )
    })).sort((a, b) => a.distance - b.distance);

    // Update every other temple to level 4, and some to level 5
    let updatedToLevel4 = 0;
    let updatedToLevel5 = 0;

    for (let i = 0; i < templesWithDistance.length; i++) {
      const temple = templesWithDistance[i];
      let newLevel = 3; // Default

      // Update every 2nd temple to level 4
      if (i % 2 === 1) {
        newLevel = 4;
        updatedToLevel4++;
      }

      // Update every 4th temple to level 5 (starting from index 3)
      if (i % 4 === 3) {
        newLevel = 5;
        updatedToLevel4--; // Adjust count since we're changing from 4 to 5
        updatedToLevel5++;
      }

      if (newLevel !== 3) {
        await templesCollection.updateOne(
          { _id: temple._id },
          { $set: { level: newLevel } }
        );

        console.log(`📝 Updated "${temple.name}" (${temple.latitude.toFixed(4)}, ${temple.longitude.toFixed(4)}) from level 3 to level ${newLevel}`);
      }
    }

    console.log(`\n✅ Update Summary:`);
    console.log(`   Level 4: ${updatedToLevel4} temples`);
    console.log(`   Level 5: ${updatedToLevel5} temples`);
    console.log(`   Unchanged (Level 3): ${templesNearJaffna.length - updatedToLevel4 - updatedToLevel5} temples`);

  } catch (error) {
    console.error('❌ Error updating temple levels:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateJaffnaTempleLevels().catch(console.error);
