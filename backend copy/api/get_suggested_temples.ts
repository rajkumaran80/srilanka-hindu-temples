import { MongoClient, ObjectId, Db } from "mongodb";

// Define interfaces for the API
interface SuggestedTempleDocument {
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
  suggested_by?: string;
  suggestion_date?: Date;
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
  console.log('Get Suggested Temples API handler called');
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

  if (req.method !== "GET") {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
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

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    console.log(`Fetching suggested temples - Page: ${page}, Limit: ${limit}`);

    // Get total count for pagination
    const totalCount = await db.collection<SuggestedTempleDocument>("suggested_temples").countDocuments();

    // Fetch suggested temples with pagination
    const suggestedTemples = await db.collection<SuggestedTempleDocument>("suggested_temples")
      .find({})
      .skip(skip)
      .limit(limit)
      .sort({ suggestion_date: -1 }) // Sort by newest first
      .toArray();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(`Found ${suggestedTemples.length} suggested temples (total: ${totalCount})`);

    console.log('Sending successful response');
    res.status(200).json({
      success: true,
      temples: suggestedTemples.map(temple => ({
        id: temple._id.toString(),
        osm_id: temple.osm_id,
        level: temple.level,
        latitude: temple.latitude,
        longitude: temple.longitude,
        name: temple.name,
        temple_name: temple.temple_name,
        deity: temple.deity,
        description: temple.description,
        location: temple.location,
        district: temple.district,
        suburb: temple.suburb,
        village: temple.village,
        photos: temple.photos || [],
        unapproved_photos: temple.unapproved_photos || [],
        suggested_by: temple.suggested_by,
        suggestion_date: temple.suggestion_date,
        disabled: temple.disabled
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext,
        hasPrev,
        limit
      }
    });

  } catch (err: unknown) {
    console.error('==================== ERROR IN GET SUGGESTED TEMPLES API ====================');
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
