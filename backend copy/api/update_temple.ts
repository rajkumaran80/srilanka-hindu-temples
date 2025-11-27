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
  console.log('Update Temple API handler called');
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

  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.status(405).json({ error: 'Method not allowed. Use PUT or PATCH.' });
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

    // Parse request body
    let updateData;
    try {
      updateData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { id, ...fieldsToUpdate } = updateData;

    if (!id) {
      return res.status(400).json({ error: 'Temple ID is required' });
    }

    console.log(`Updating temple with ID: ${id}`);
    console.log('Fields to update:', Object.keys(fieldsToUpdate));

    // Convert string ID to ObjectId
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (idError) {
      console.error('Invalid ObjectId format:', id);
      return res.status(400).json({ error: 'Invalid temple ID format' });
    }

    // Prepare update object - only include fields that are provided and not null/undefined
    const updateFields: any = {};

    // Handle specific field conversions
    if (fieldsToUpdate.latitude !== undefined && fieldsToUpdate.latitude !== null) {
      updateFields.latitude = parseFloat(fieldsToUpdate.latitude);
    }
    if (fieldsToUpdate.longitude !== undefined && fieldsToUpdate.longitude !== null) {
      updateFields.longitude = parseFloat(fieldsToUpdate.longitude);
    }
    if (fieldsToUpdate.level !== undefined && fieldsToUpdate.level !== null) {
      updateFields.level = parseInt(fieldsToUpdate.level, 10);
    }

    // Handle boolean fields
    if (fieldsToUpdate.disabled !== undefined) {
      updateFields.disabled = Boolean(fieldsToUpdate.disabled);
    }

    // Handle string fields
    const stringFields = ['name', 'temple_name', 'deity', 'description', 'location', 'district', 'suburb', 'village'];
    stringFields.forEach(field => {
      if (fieldsToUpdate[field] !== undefined) {
        updateFields[field] = fieldsToUpdate[field] || ''; // Convert null to empty string
      }
    });

    // Handle photos array
    if (fieldsToUpdate.photos !== undefined) {
      if (Array.isArray(fieldsToUpdate.photos)) {
        updateFields.photos = fieldsToUpdate.photos.filter((url: any) => url && url.trim());
      } else if (typeof fieldsToUpdate.photos === 'string') {
        updateFields.photos = fieldsToUpdate.photos.split(',').map((url: string) => url.trim()).filter((url: string) => url);
      }
    }

    console.log('Final update fields:', updateFields);

    // Perform the update
    const result = await db.collection<TempleDocument>("temples").updateOne(
      { _id: objectId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Temple not found' });
    }

    if (result.modifiedCount === 0) {
      console.log('No changes were made to the temple');
    } else {
      console.log(`Successfully updated temple with ${result.modifiedCount} modifications`);
    }

    // Fetch and return the updated temple
    const updatedTemple = await db.collection<TempleDocument>("temples").findOne({ _id: objectId });

    console.log('Sending successful response');
    res.status(200).json({
      success: true,
      message: 'Temple updated successfully',
      temple: {
        id: updatedTemple?._id.toString(),
        osm_id: updatedTemple?.osm_id,
        level: updatedTemple?.level,
        latitude: updatedTemple?.latitude,
        longitude: updatedTemple?.longitude,
        name: updatedTemple?.name,
        temple_name: updatedTemple?.temple_name,
        deity: updatedTemple?.deity,
        description: updatedTemple?.description,
        location: updatedTemple?.location,
        district: updatedTemple?.district,
        suburb: updatedTemple?.suburb,
        village: updatedTemple?.village,
        photos: updatedTemple?.photos
      }
    });

  } catch (err: unknown) {
    console.error('==================== ERROR IN UPDATE TEMPLE API ====================');
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
