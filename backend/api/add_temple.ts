import { MongoClient, Db, ObjectId } from "mongodb";

// Define interfaces for the API
interface TempleData {
  name: string;
  latitude: number;
  longitude: number;
  location?: string;
  description?: string;
  deity?: string;
  temple_type?: string;
  district?: string;
  photos?: string[];
  submitted_by?: string;
  submitted_at?: Date;
  status?: 'pending' | 'approved' | 'rejected';
}

interface StatusResponse {
  json: (data: any) => void;
  end: () => void;
}

interface VercelResponse {
  status: (code: number) => StatusResponse;
  json: (data: any) => void;
  headersSent?: boolean;
}

interface VercelRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | any;
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
  console.log('Add Temple API handler called');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Set CORS headers for Vercel deployment
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return res.status(200).json({});
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    console.log('Checking environment variables...');
    // Check if environment variable is defined
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!MONGO_URI) {
      console.error('MONGO_URI environment variable is not defined');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    console.log('Environment variable check passed');
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();

    // Parse request body - handle both string and object formats
    let requestBody: any;
    try {
      if (typeof req.body === 'string') {
        requestBody = req.body ? JSON.parse(req.body) : {};
      } else {
        requestBody = req.body || {};
      }
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const {
      name,
      latitude,
      longitude,
      location,
      description,
      deity,
      temple_type,
      district,
      photos = [],
      submitted_by
    } = requestBody;

    // Validate required fields
    if (!name || name.trim() === '') {
      console.log('Missing temple name');
      return res.status(400).json({ error: 'Temple name is required' });
    }

    if (latitude === undefined || latitude === null || isNaN(latitude)) {
      console.log('Invalid latitude');
      return res.status(400).json({ error: 'Valid latitude is required' });
    }

    if (longitude === undefined || longitude === null || isNaN(longitude)) {
      console.log('Invalid longitude');
      return res.status(400).json({ error: 'Valid longitude is required' });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
    }

    console.log(`Adding new temple: ${name} at (${latitude}, ${longitude})`);

    // Create temple object
    const newTemple: TempleData = {
      name: name.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location: location?.trim(),
      description: description?.trim(),
      deity: deity?.trim(),
      temple_type: temple_type?.trim(),
      district: district?.trim(),
      photos: Array.isArray(photos) ? photos : [],
      submitted_by: submitted_by?.trim(),
      submitted_at: new Date(),
      status: 'pending'
    };

    // Insert new temple document
    const insertResult = await db.collection("suggested_temples").insertOne(newTemple);

    if (!insertResult.acknowledged) {
      console.log('Failed to insert temple');
      return res.status(500).json({ error: 'Failed to add temple' });
    }

    console.log(`Temple added successfully with ID: ${insertResult.insertedId}`);
    console.log('Sending successful response');

    res.status(201).json({
      success: true,
      message: 'Temple added successfully',
      temple: {
        id: insertResult.insertedId.toString(),
        ...newTemple
      }
    });

  } catch (err: unknown) {
    console.error('==================== ERROR IN ADD TEMPLE API ====================');
    const error = err as any; // Type assertion for error handling
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error code:', error?.code);
    console.error('MONGO_URI exists:', !!process.env.MONGO_URI);
    console.error('MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.error('===================================================================');

    // Make sure we always return a proper HTTP response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
