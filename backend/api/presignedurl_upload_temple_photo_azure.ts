// api/upload_temple_photo_azure.ts
// Vercel Serverless handler (TypeScript)
// Generates presigned URL for uploading photo to Azure Blob Storage

import { MongoClient, ObjectId } from 'mongodb';
import { BlobServiceClient, BlobSASPermissions, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';

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
  body: string | any;
  query: Record<string, string | any>;
  url: string;
}

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const AZURE_STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'temple-photos';
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'srilanka-hindu-temples';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'temples';

// --- Mongo client reuse (recommended for serverless)
let cachedClient: MongoClient | null = null;
async function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) throw new Error('MONGODB_URI env missing');
  if (cachedClient) return cachedClient;
  const c = new MongoClient(MONGODB_URI);
  await c.connect();
  cachedClient = c;
  return c;
}

function slugify(name: string) {
  return name
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function uniqueFileName(ext = 'jpg') {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}.${ext}`;
}

function parsePossibleObjectId(id: string) {
  // If looks like ObjectId hex (24 hex chars), return ObjectId, else return original string
  if (!id) return id;
  if (/^[a-fA-F0-9]{24}$/.test(id)) {
    try {
      return new ObjectId(id);
    } catch {
      return id;
    }
  }
  return id;
}

async function generatePresignedUrl(containerName: string, blobName: string): Promise<string> {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_ACCOUNT_KEY) {
    throw new Error('Azure Storage account name and key are required');
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY);

  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists({ access: 'blob' });

  const blobClient = containerClient.getBlockBlobClient(blobName);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn);
  expiresOn.setMinutes(startsOn.getMinutes() + 15); // 15 minutes expiry

  const sasOptions = {
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('w'), // write permission
    startsOn,
    expiresOn,
  };

  const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();

  return `${blobClient.url}?${sasToken}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ ok: false, error: 'Method not allowed, use POST' });
      return;
    }

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      res.status(500).json({ ok: false, error: 'Server misconfigured: AZURE_STORAGE_CONNECTION_STRING missing' });
      return;
    }

    if (!MONGODB_URI) {
      res.status(500).json({ ok: false, error: 'Server misconfigured: MONGODB_URI missing' });
      return;
    }

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
      res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
      return;
    }

    const { templeId, fileType = 'image/jpeg' } = requestBody;

    if (!templeId) {
      res.status(400).json({ ok: false, error: 'templeId is required' });
      return;
    }

    // connect to mongo and fetch temple by id
    const client = await getMongoClient();
    const collection = client.db(MONGODB_DB).collection(MONGODB_COLLECTION);

    const queryId = parsePossibleObjectId(String(templeId));
    let templeDoc;
    if (queryId instanceof ObjectId) {
      templeDoc = await collection.findOne({ _id: queryId });
    } else {
      templeDoc = await collection.findOne({
        $or: [{ osm_id: Number(templeId) }, { 'tags.name': String(templeId) }],
      });
    }

    if (!templeDoc) {
      res.status(404).json({ ok: false, error: 'Temple not found in DB for provided templeId' });
      return;
    }

    // determine folder name from temple name (prefer templeDoc.name, then tags.name)
    const templeNameRaw = templeDoc.name || (templeDoc.tags && templeDoc.tags.name) || String(templeId);
    const folderName = slugify(templeNameRaw);

    // determine file extension from fileType
    let ext = 'jpg';
    if (fileType.includes('png')) ext = 'png';
    else if (fileType.includes('gif')) ext = 'gif';
    else if (fileType.includes('webp')) ext = 'webp';

    const finalName = uniqueFileName(ext);
    const blobName = `${folderName}/${finalName}`;

    console.log(`Generating presigned URL for temple ${templeId} (folder '${folderName}') blob: ${blobName}`);

    const presignedUrl = await generatePresignedUrl(AZURE_STORAGE_CONTAINER, blobName);

    res.status(200).json({
      ok: true,
      presignedUrl,
      blobName,
      container: AZURE_STORAGE_CONTAINER,
      templeName: templeNameRaw,
      fileName: finalName
    });
  } catch (err: any) {
    console.error('upload_temple_photo_azure error:', err);
    const msg = err?.message || 'internal error';
    res.status(500).json({ ok: false, error: msg });
  }
}
