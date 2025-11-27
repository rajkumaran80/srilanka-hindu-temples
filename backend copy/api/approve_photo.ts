import { MongoClient, ObjectId, Db } from "mongodb";

// Define interfaces for the API
interface TempleDocument {
  _id: ObjectId;
  osm_id?: number;
  added_at?: {
    $date: string;
  };
  latitude?: number;
  longitude?: number;
  name?: string;
  temple_name?: string;
  location?: string;
  osm_type?: string;
  photos?: string[];
  unapproved_photos?: string[];
  source?: string;
  level?: number;
  deity?: string;
  description?: string;
  district?: string;
  suburb?: string;
  village?: string;
  disabled?: boolean;
  [key: string]: any;
}

interface StatusResponse {
  json: (data: any) => void;
  end: () => void;
}

interface VercelResponse {
  status: (code: number) => StatusResponse;
  json: (data: any) => void;
  headersSent?: boolean;
  setHeader: (name: string, value: string) => void;
}

interface VercelRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | null;
  query: Record<string, string | any>;
  url: string;
}

// Global variable to cache the MongoDB client for reuse between function calls
const MONGODB_URI: string = process.env.MONGODB_URI!;
const DATABASE: string = process.env.DATABASE!;

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
    maxPoolSize: 10, // Maintain up to 10 connections
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('Approve Photo API handler called');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Max-Age", "600");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    console.log('Checking environment variables...');
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGO_URI) {
      console.error('MONGO_URI environment variable is not defined');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    console.log('Environment variable check passed');
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();

    // Get temple ID and photo URL from request body
    let templeId: string;
    let photoUrl: string;

    if (req.body) {
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      templeId = bodyData.templeId;
      photoUrl = bodyData.photoUrl;
    } else {
      return res.status(400).json({ error: 'Temple ID and photo URL are required' });
    }

    if (!templeId || !photoUrl) {
      return res.status(400).json({ error: 'Temple ID and photo URL are required' });
    }

    console.log(`Approving photo for temple ${templeId}: ${photoUrl}`);

    // Convert string ID to ObjectId
    let objectId;
    try {
      objectId = new ObjectId(templeId);
    } catch (idError) {
      console.error('Invalid ObjectId format:', templeId);
      return res.status(400).json({ error: 'Invalid temple ID format' });
    }

    // First, get the current temple to check if photo exists in unapproved_photos
    const temple = await db.collection<TempleDocument>("temples").findOne({ _id: objectId });

    if (!temple) {
      return res.status(404).json({ error: 'Temple not found' });
    }

    if (!temple.unapproved_photos || !temple.unapproved_photos.includes(photoUrl)) {
      return res.status(400).json({ error: 'Photo not found in unapproved photos' });
    }

    // Prepare update operations
    const updateOperations: any = {
      $push: { photos: photoUrl }, // Add to approved photos
      $pull: { unapproved_photos: photoUrl } // Remove from unapproved photos
    };

    // Perform the update
    const result = await db.collection<TempleDocument>("temples").updateOne(
      { _id: objectId },
      updateOperations
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: 'Failed to approve photo' });
    }

    console.log(`Successfully approved photo for temple ${templeId}`);

    // Fetch and return the updated temple
    const updatedTemple = await db.collection<TempleDocument>("temples").findOne({ _id: objectId });

    console.log('Sending successful response');
    res.status(200).json({
      success: true,
      message: 'Photo approved successfully',
      temple: {
        id: updatedTemple?._id.toString(),
        name: updatedTemple?.name,
        temple_name: updatedTemple?.temple_name,
        photos: updatedTemple?.photos || [],
        unapproved_photos: updatedTemple?.unapproved_photos || []
      }
    });

  } catch (err: unknown) {
    console.error('==================== ERROR IN APPROVE PHOTO API ====================');
    const error = err as any;
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error code:', error?.code);
    console.error('===================================================================');

    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
