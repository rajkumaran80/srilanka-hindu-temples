/*
TypeScript script: Set default level = 3 for temples where level field is empty/null.

Instructions:
- Finds temples where level field is null, undefined, or doesn't exist
- Sets level = 3 (integer) for all matching temples
- Useful for ensuring all temples have a level for proper marker display

Run: `npx tsx src/set-default-levels.ts`

Notes:
- Updates all temples without a level field
- Sets level to 3 (standard level for verified temples)
*/

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

// --- Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'srilanka-hindu-temples';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'temples';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Set it and re-run.');
  process.exit(1);
}

// Main runner
async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  const collection = db.collection(MONGODB_COLLECTION);

  // Find temples where level is null, undefined, or doesn't exist
  const query = {
    $or: [
      { level: null },
      { level: { $exists: false } },
      { level: undefined }
    ]
  };

  // Count matching documents first
  const count = await collection.countDocuments(query);
  console.log(`Found ${count} temples without level field`);

  if (count === 0) {
    console.log('No temples need level updates. All temples already have level field.');
    await client.close();
    return;
  }

  // Update all matching documents with level = 3
  const result = await collection.updateMany(
    query,
    {
      $set: {
        level: 3
      }
    }
  );

  console.log(`Updated ${result.modifiedCount} temples with level = 3`);

  // Verify the update
  const updatedCount = await collection.countDocuments({
    level: 3,
    ...query // Should now return 0 since they all have level = 3
  });

  console.log(`Verification: ${updatedCount} temples now have level = 3`);

  // Get total count of temples with level = 3
  const totalLevel3 = await collection.countDocuments({ level: 3 });
  console.log(`Total temples with level 3: ${totalLevel3}`);

  await client.close();
}

// Execute
main().catch(err => { console.error(err); process.exit(1); });
