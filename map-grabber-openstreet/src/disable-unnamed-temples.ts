/*
TypeScript script: Add disabled=true field to unnamed temples with null temple_name.

Instructions:
- Finds temples where name starts with 'unnamed' and temple_name is null
- Adds disabled=true field to mark them as disabled

Run: `npx tsx src/disable-unnamed-temples.ts`

Notes:
- Updates all matching temples with disabled=true
- Useful for filtering out unidentified temples in the app
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

  // Find temples with name starting with 'unnamed' and temple_name is null
  const query = {
    name: { $regex: /^unnamed/i },
    $or: [
      { temple_name: null },
      { temple_name: { $exists: false } },
      { temple_name: '' }
    ]
  };

  // Count matching documents first
  const count = await collection.countDocuments(query);
  console.log(`Found ${count} temples matching criteria`);

  // Update all matching documents with disabled=true
  const result = await collection.updateMany(
    query,
    {
      $set: {
        disabled: true
      }
    }
  );

  console.log(`Updated ${result.modifiedCount} temples with disabled=true`);

  // Verify the update
  const updatedCount = await collection.countDocuments({
    ...query,
    disabled: true
  });

  console.log(`Verification: ${updatedCount} temples now have disabled=true`);

  await client.close();
}

// Execute
main().catch(err => { console.error(err); process.exit(1); });
