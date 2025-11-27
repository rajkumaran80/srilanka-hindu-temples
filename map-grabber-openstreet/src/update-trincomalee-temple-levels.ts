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

async function updateTrincomaleeTempleLevels() {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'srilanka-hindu-temples';

  console.log('🔄 Connecting to MongoDB...');

  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    const templesCollection = db.collection<Temple>('temples');

    // Trincomalee town coordinates (approximately)
    const trincomaleeCenter = {
      lat: 8.5711,
      lng: 81.2335
    };

    // Search radius: ~10km around Trincomalee town (larger area than Jaffna)
    const searchRadiusKm = 10;
    const searchRadiusDegrees = searchRadiusKm / 111.32; // Rough conversion

    console.log(`🔍 Finding temples within ${searchRadiusKm}km of Trincomalee town (${trincomaleeCenter.lat}, ${trincomaleeCenter.lng}) with level > 4`);

    // Find temples within the radius that have level higher than 4
    const templesNearTrincomalee = await templesCollection.find({
      latitude: {
        $gte: trincomaleeCenter.lat - searchRadiusDegrees,
        $lte: trincomaleeCenter.lat + searchRadiusDegrees
      },
      longitude: {
        $gte: trincomaleeCenter.lng - searchRadiusDegrees,
        $lte: trincomaleeCenter.lng + searchRadiusDegrees
      },
      level: { $gt: 4 },
      name: { $not: { $regex: '^unnamed', $options: 'i' } }
    }).toArray();

    console.log(`📍 Found ${templesNearTrincomalee.length} temples with level > 4 near Trincomalee`);

    if (templesNearTrincomalee.length === 0) {
      console.log('ℹ️ No temples with level > 4 found in the area');
      return;
    }

    // Calculate distance from center and sort by distance
    const templesWithDistance = templesNearTrincomalee.map(temple => ({
      ...temple,
      distance: Math.sqrt(
        Math.pow(temple.latitude - trincomaleeCenter.lat, 2) +
        Math.pow(temple.longitude - trincomaleeCenter.lng, 2)
      )
    })).sort((a, b) => a.distance - b.distance);

    // Update temples: closer ones to level 3, farther ones to level 4
    let updatedToLevel3 = 0;
    let updatedToLevel4 = 0;

    // Split the temples: closer half go to level 3, farther half go to level 4
    const midpoint = Math.ceil(templesWithDistance.length / 2);

    for (let i = 0; i < templesWithDistance.length; i++) {
      const temple = templesWithDistance[i];
      let newLevel = 3; // Default for closer temples

      // Temples in the farther half get level 4
      if (i >= midpoint) {
        newLevel = 4;
        updatedToLevel4++;
      } else {
        updatedToLevel3++;
      }

      await templesCollection.updateOne(
        { _id: temple._id },
        { $set: { level: newLevel } }
      );

      console.log(`📝 Updated "${temple.name}" (${temple.latitude.toFixed(4)}, ${temple.longitude.toFixed(4)}) from level ${temple.level} to level ${newLevel}`);
    }

    console.log(`\n✅ Update Summary:`);
    console.log(`   Level 3: ${updatedToLevel3} temples`);
    console.log(`   Level 4: ${updatedToLevel4} temples`);
    console.log(`   Total updated: ${templesNearTrincomalee.length} temples`);

  } catch (error) {
    console.error('❌ Error updating temple levels:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateTrincomaleeTempleLevels().catch(console.error);
