import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from "cors";


// Load environment variables
dotenv.config();

const app: express.Application = express();

// Middleware to parse JSON with increased limit for photo uploads
app.use(express.json({ limit: '50mb' }));

// CORS configuration
// Allow origin set via CORS_ORIGIN env var or allow all by default for local development
const corsOptions: cors.CorsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: true, // uncomment if your frontend needs cookies/auth with credentials
};

// Enable CORS for all routes
app.use(cors(corsOptions));
// Enable pre-flight for all routes
app.options('*', cors(corsOptions));

// Vercel serverless function types
interface VercelRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | null;
  query: Record<string, string | any>;
  url: string;
}

interface VercelResponse {
  status: (code: number) => {
    json: (data: any) => void;
    end: () => void;
  };
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
}

type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

// Import the Vercel serverless functions
const templesInitialHandler: VercelHandler = (await import('./api/temples_initial.js')).default;
const templesAllHandler: VercelHandler = (await import('./api/temples_all.js')).default;
const templesLoadHandler: VercelHandler = (await import('./api/temples_load.js')).default;
const templesSearchByNameHandler: VercelHandler = (await import('./api/temples_search_by_name.js')).default;
const templesSearchByIdHandler: VercelHandler = (await import('./api/temples_search_by_id.js')).default;
const addTempleCommentHandler: VercelHandler = (await import('./api/add_temple_comment.js')).default;
const addSuggestedTempleNameHandler: VercelHandler = (await import('./api/add_suggested_temple_name.js')).default;

const presignedUploadPhotoHandler: VercelHandler = (await import('./api/presigned_upload_photo.js')).default;
const addUnapprovedPhotoHandler: VercelHandler = (await import('./api/add_unapproved_photo.js')).default;
const addApprovedPhotoHandler: VercelHandler = (await import('./api/add_approved_photo.js')).default;


const addTempleHandler: VercelHandler = (await import('./api/add_temple.js')).default;
const updateTempleHandler: VercelHandler = (await import('./api/update_temple.js')).default;
const deleteTempleHandler: VercelHandler = (await import('./api/delete_temple.js')).default;
const presignedUploadSuggestedTemplePhotoHandler: VercelHandler = (await import('./api/presigned_upload_photo_to_suggested_temple.js')).default;
const addSuggestedTempleUnapprovedPhotoHandler: VercelHandler = (await import('./api/add_unapproved_photo_to_suggested_temple.js')).default;
const templesWithUnapprovedPhotosHandler: VercelHandler = (await import('./api/temples_with_unapproved_photos.js')).default;
const getSuggestedTemplesHandler: VercelHandler = (await import('./api/get_suggested_temples.js')).default;
const approveSuggestedTempleHandler: VercelHandler = (await import('./api/approve_suggested_temple.js')).default;
const approvePhotoHandler: VercelHandler = (await import('./api/approve_photo.js')).default;
const bookingHotelsSearchHandler: VercelHandler = (await import('./api/booking_hotels_search.js')).default;
const bookingHotelsLinkHandler: VercelHandler = (await import('./api/booking_hotels_link.js')).default;

// Helper function to convert Express req/res to Vercel format
function createVercelRequest(req: Request): VercelRequest {
  return {
    method: req.method,
    headers: req.headers,
    body: req.body ? JSON.stringify(req.body) : null,
    query: req.query,
    url: req.url,
  };
}

function createVercelResponse(res: Response): VercelResponse {
  const vercelRes: VercelResponse = {
    status: (code: number) => ({
      json: (data: any) => res.status(code).json(data),
      end: () => res.status(code).end(),
    }),
    json: (data: any) => res.json(data),
    setHeader: (name: string, value: string) => res.setHeader(name, value),
  };
  return vercelRes;
}

// Routes that mimic Vercel API routes
// app.get('/api/temples', (req, res) => {
//   const vercelReq = createVercelRequest(req);
//   const vercelRes = createVercelResponse(res);
//   templesHandler(vercelReq, vercelRes);
// });

// app.get('/api/temples_filter', (req, res) => {
//   const vercelReq = createVercelRequest(req);
//   const vercelRes = createVercelResponse(res);
//   templesFilterHandler(vercelReq, vercelRes);
// });

app.get('/api/temples_initial.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  templesInitialHandler(vercelReq, vercelRes);
});

app.get('/api/temples_all.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  templesAllHandler(vercelReq, vercelRes);
});

app.get('/api/temples_load.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  templesLoadHandler(vercelReq, vercelRes);
});

app.get('/api/temples_search_by_name.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  templesSearchByNameHandler(vercelReq, vercelRes);
});

app.get('/api/temples_search_by_id.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  templesSearchByIdHandler(vercelReq, vercelRes);
});

app.put('/api/update_temple.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  updateTempleHandler(vercelReq, vercelRes);
});

app.delete('/api/delete_temple.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  deleteTempleHandler(vercelReq, vercelRes);
});

app.post('/api/add_temple_comment.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  addTempleCommentHandler(vercelReq, vercelRes);
});

app.post('/api/add_suggested_temple_name.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  addSuggestedTempleNameHandler(vercelReq, vercelRes);
});

app.post('/api/presigned_upload_photo.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  presignedUploadPhotoHandler(vercelReq, vercelRes);
});

app.post('/api/add_unapproved_photo.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  addUnapprovedPhotoHandler(vercelReq, vercelRes);
});

app.post('/api/add_approved_photo.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  addApprovedPhotoHandler(vercelReq, vercelRes);
});

app.post('/api/add_temple.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  addTempleHandler(vercelReq, vercelRes);
});

app.post('/api/presigned_upload_photo_to_suggested_temple.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  presignedUploadSuggestedTemplePhotoHandler(vercelReq, vercelRes);
});

app.post('/api/add_unapproved_photo_to_suggested_temple.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  addSuggestedTempleUnapprovedPhotoHandler(vercelReq, vercelRes);
});

app.get('/api/temples_with_unapproved_photos.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  templesWithUnapprovedPhotosHandler(vercelReq, vercelRes);
});

app.get('/api/get_suggested_temples.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  getSuggestedTemplesHandler(vercelReq, vercelRes);
});

app.post('/api/approve_suggested_temple.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  approveSuggestedTempleHandler(vercelReq, vercelRes);
});

app.post('/api/approve_photo.ts', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  approvePhotoHandler(vercelReq, vercelRes);
});

app.post('/api/hotels/search', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  bookingHotelsSearchHandler(vercelReq, vercelRes);
});

app.get('/api/hotels/:hotelId/link', (req, res) => {
  const vercelReq = createVercelRequest(req);
  const vercelRes = createVercelResponse(res);
  bookingHotelsLinkHandler(vercelReq, vercelRes);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sri Lanka Hindu Temples API is running locally' });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Sri Lanka Hindu Temples API running locally on http://localhost:${PORT}`);
  console.log(`📚 API endpoints:`);
  console.log(`   GET /api/temples - Get all temples`);
  console.log(`   GET /api/temples_filter?district=<district> - Filter temples by district`);
  console.log(`   GET /api/temples_initial - Get first 5 temples`);
  console.log(`   GET /api/temples_search?north=&south=&east=&west=&limit= - Search by geographic bounds`);
  console.log(`   GET /api/temples_search_by_name?name=<name> - Search temples by name`);
  console.log(`   GET /api/temples_search_by_name?name=<name> - Search temples by name`);
  console.log(`   POST /api/add_temple_comment - Add comment to temple`);
  console.log(`   POST /api/add_suggested_temple_name - Add suggested name to temple`);
  console.log(`   POST /api/upload_temple_photo - Upload temple photos`);
  console.log(`   POST /api/upload_temple_photo_azure - Generate Azure blob presigned URL for photo upload`);
  console.log(`   POST /api/add_unapproved_photo - Add photo name to temple's unapproved_photos field`);
  console.log(`   POST /api/add_temple - Add new temple submission`);
  console.log(`   POST /api/add_suggested_temple_photo - Add photo to suggested temple`);
  console.log(`   POST /api/presigned_upload_suggested_temple_photo - Generate presigned URL for suggested temple photo upload`);
  console.log(`   POST /api/upload_suggested_temple_photo - Upload photo directly for suggested temple`);
  console.log(`   POST /api/hotels/search - Search hotels via Booking.com API`);
  console.log(`   GET /api/hotels/:hotelId/link - Generate affiliate booking link`);
  console.log(`   GET /health - Health check`);
});
