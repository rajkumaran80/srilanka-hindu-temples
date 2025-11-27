import { MongoClient } from 'mongodb';

async function checkDatabase() {
  const uri = 'mongodb+srv://srilanka_temples_admin:srilanka_temples_admin123@srilanka-cluster.6k82w97.mongodb.net/?appName=Srilanka-Cluster';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const database = client.db('srilanka-hindu-temples');

    // List all collections
    const collections = await database.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Check the temples collection
    const collection = database.collection('temples');

    // Count total documents
    const totalCount = await collection.countDocuments();
    console.log(`Total documents in temples: ${totalCount}`);

    // Check a few documents to see their structure
    const sampleDocs = await collection.find({}).limit(3).toArray();
    console.log('Sample documents:');
    sampleDocs.forEach((doc, index) => {
      console.log(`Document ${index + 1}:`, {
        _id: doc._id,
        hasPhotos: doc.hasOwnProperty('photos'),
        hasApprovedPhotos: doc.hasOwnProperty('approved_photos'),
        photosCount: doc.photos ? doc.photos.length : 0,
        approvedPhotosCount: doc.approved_photos ? doc.approved_photos.length : 0
      });
    });

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkDatabase().catch(console.error);
