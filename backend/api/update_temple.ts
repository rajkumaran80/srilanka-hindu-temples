import { MongoClient, Db, ObjectId } from "mongodb";

// Define interfaces for the API
interface CommentData {
  templeId: string;
  comment: string;
  created_at?: Date;
}

interface SuggestedNameData {
  templeId: string;
  suggestedName: string;
  created_at?: Date;
}

interface RatingData {
  templeId: string;
  rating: number;
  created_at?: Date;
}

interface TempleDocument {
  _id: ObjectId;
  osm_id?: number;
  comments?: CommentData[];
  suggestedNames?: SuggestedNameData[];
  ratings?: RatingData[];
  rating?: number; // Computed overall rating (average of all ratings)
  updated_at?: Date;
  [key: string]: any;
}

interface StatusResponse {
  json: (data: any) => void;
  end: () => void;
}

interface VercelResponse {
  status: (code: number) => StatusResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
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
  console.log('Update Temple API handler called');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

    const { operation, templeId } = requestBody;

    // Validate required fields
    if (!operation) {
      console.log('Missing operation');
      return res.status(400).json({ error: 'operation is required' });
    }

    if (!templeId) {
      console.log('Missing templeId');
      return res.status(400).json({ error: 'templeId is required' });
    }

    // Validate operation type
    const validOperations = ['comment', 'rating', 'suggest_name'];
    if (!validOperations.includes(operation)) {
      console.log('Invalid operation:', operation);
      return res.status(400).json({
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
      });
    }

    console.log(`Processing ${operation} operation for temple: ${templeId}`);

    let updateOperation: any;
    let successMessage: string;
    let responseData: any;

    switch (operation) {
      case 'comment': {
        const { comment } = requestBody;

        if (!comment || comment.trim() === '') {
          console.log('Missing or empty comment');
          return res.status(400).json({ error: 'comment is required and cannot be empty' });
        }

        const newComment: CommentData = {
          templeId,
          comment: comment.trim(),
          created_at: new Date(),
        };

        updateOperation = {
          $push: { comments: newComment }
        };

        successMessage = 'Comment added successfully';
        responseData = { comment: newComment };
        break;
      }

      case 'rating': {
        const { rating } = requestBody;

        if (rating === undefined || rating === null) {
          console.log('Missing rating');
          return res.status(400).json({ error: 'rating is required' });
        }

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
          console.log('Invalid rating value:', rating);
          return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
        }

        const newRating: RatingData = {
          templeId,
          rating: Math.floor(rating), // Ensure it's an integer
          created_at: new Date(),
        };

        updateOperation = {
          $push: { ratings: newRating }
        };

        successMessage = 'Rating submitted successfully';
        responseData = { rating: newRating };
        break;
      }

      case 'suggest_name': {
        const { suggestedName } = requestBody;

        if (!suggestedName || suggestedName.trim() === '') {
          console.log('Missing or empty suggestedName');
          return res.status(400).json({ error: 'suggestedName is required and cannot be empty' });
        }

        const newSuggestedName: SuggestedNameData = {
          templeId,
          suggestedName: suggestedName.trim(),
          created_at: new Date(),
        };

        updateOperation = {
          $push: { suggestedNames: newSuggestedName }
        };

        successMessage = 'Suggested name added successfully';
        responseData = { suggestedName: newSuggestedName };
        break;
      }

      default:
        // This should never happen due to validation above
        return res.status(400).json({ error: 'Invalid operation' });
    }

    // Execute the update operation
    const updateResult = await (db.collection("temples") as any).updateOne(
      { _id: ObjectId.createFromHexString(templeId) },
      {
        ...updateOperation,
        $set: { updated_at: new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      console.log(`Temple not found: ${templeId}`);
      return res.status(404).json({ error: 'Temple not found' });
    }

    if (updateResult.modifiedCount === 0) {
      console.log(`Failed to ${operation} for temple: ${templeId}`);
      return res.status(500).json({ error: `Failed to ${operation}` });
    }

    // If this was a rating operation, calculate and update the overall rating
    if (operation === 'rating') {
      try {
        console.log('Calculating overall rating for temple:', templeId);

        // Fetch all ratings for this temple
        const templeDoc = await (db.collection("temples") as any).findOne(
          { _id: ObjectId.createFromHexString(templeId) },
          { projection: { ratings: 1 } }
        );

        if (templeDoc && templeDoc.ratings && templeDoc.ratings.length > 0) {
          // Calculate average rating
          const totalRating = templeDoc.ratings.reduce((sum: number, rating: RatingData) => sum + rating.rating, 0);
          const averageRating = Math.round((totalRating / templeDoc.ratings.length) * 10) / 10; // Round to 1 decimal place

          // Update the temple with the computed overall rating
          await (db.collection("temples") as any).updateOne(
            { _id: ObjectId.createFromHexString(templeId) },
            {
              $set: {
                rating: averageRating,
                updated_at: new Date()
              }
            }
          );

          console.log(`Updated overall rating for temple ${templeId} to ${averageRating}`);
        }
      } catch (ratingError) {
        console.error('Error calculating overall rating:', ratingError);
        // Don't fail the entire operation if rating calculation fails
        // The rating was already added successfully
      }
    }

    console.log(`${operation} added successfully for temple: ${templeId}`);
    console.log('Sending successful response');
    res.status(201).json({
      success: true,
      message: successMessage,
      operation,
      ...responseData
    });

  } catch (err: unknown) {
    console.error('==================== ERROR IN UPDATE TEMPLE API ====================');
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
