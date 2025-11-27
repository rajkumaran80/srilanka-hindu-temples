import { MongoClient } from 'mongodb';

async function removePhotosField() {
  const uri = 'mongodb+srv://srilanka_temples_admin:srilanka_temples_admin123@srilanka-cluster.6k82w97.mongodb.net/?appName=Srilanka-Cluster';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('srilanka-hindu-temples');
    const collection = database.collection('temples');

    // Remove the 'photos' field from all documents
    const result = await collection.updateMany(
      {}, // Match all documents
      { $unset: { photos: 1 } } // Remove the photos field
    );

    console.log(`Removed photos field from ${result.modifiedCount} temples`);

  } catch (error) {
    console.error('Error removing photos field:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

removePhotosField().catch(console.error);
