// api/upload_temple_photo_azure.ts
// Vercel Serverless handler (TypeScript)
// Generates presigned URL (SAS) for uploading photo to Azure Blob Storage

import { MongoClient, ObjectId } from "mongodb";
import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from "@azure/storage-blob";

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

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const AZURE_STORAGE_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || "temple-photos";
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
const AZURE_STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "srilanka-hindu-temples";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "temples";

// --- Mongo client reuse (recommended for serverless)
let cachedClient: MongoClient | null = null;
async function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) throw new Error("MONGODB_URI env missing");
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
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueFileName(ext = "jpg") {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}.${ext}`;
}

function parsePossibleObjectId(id: string) {
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

async function createBlobServiceClient(): Promise<BlobServiceClient> {
  if (AZURE_STORAGE_CONNECTION_STRING) {
    return BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  }
  if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_ACCOUNT_KEY) {
    const cred = new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY);
    const url = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`;
    return new BlobServiceClient(url, cred);
  }
  throw new Error("Azure storage credentials missing. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME & AZURE_STORAGE_ACCOUNT_KEY");
}

async function generatePresignedUrl(containerName: string, blobName: string): Promise<string> {
  // create client
  const blobServiceClient = await createBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);

  // create container if not exists (won't change public access)
  await containerClient.createIfNotExists();

  // set CORS rules to allow uploads from browser
  const corsRules = [{
    allowedOrigins: "*",
    allowedMethods: "PUT,OPTIONS",
    allowedHeaders: "*",
    exposedHeaders: "*",
    maxAgeInSeconds: 3600
  }];
  await blobServiceClient.setProperties({ cors: corsRules });

  const blobClient = containerClient.getBlockBlobClient(blobName);

  // build SAS using account key (need account name/key)
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_ACCOUNT_KEY) {
    // If we used connection string, still require account name / key to sign SAS.
    // If you want to support MSI / KMS signing you'll need a different flow.
    throw new Error("Azure account name/key required to generate SAS token (set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY)");
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY);

  const startsOn = new Date(Date.now() - 60 * 1000); // 1 minute ago to account for clock skew
  const expiresOn = new Date(startsOn.getTime() + 15 * 60 * 1000); // 15 minutes

  const permissions = BlobSASPermissions.parse("cwa"); // create + write + add
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions,
      startsOn,
      expiresOn,
      version: "2023-11-03"
    },
    sharedKeyCredential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ ok: false, error: "Method not allowed, use POST" });
      return;
    }

    if (!MONGODB_URI) {
      res.status(500).json({ ok: false, error: "Server misconfigured: MONGODB_URI missing" });
      return;
    }

    // Parse request body - support JSON string body or object
    let requestBody: any;
    try {
      if (typeof req.body === "string") {
        requestBody = req.body ? JSON.parse(req.body) : {};
      } else {
        requestBody = req.body || {};
      }
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      res.status(400).json({ ok: false, error: "Invalid JSON in request body" });
      return;
    }

    const { templeId, fileType = "image/jpeg", filename, fileData } = requestBody;

    if (!templeId) {
      res.status(400).json({ ok: false, error: "templeId is required" });
      return;
    }

    // connect to mongo and fetch temple by id
    const client = await getMongoClient();
    const collection = client.db(MONGODB_DB).collection(MONGODB_COLLECTION);

    const queryId = parsePossibleObjectId(String(templeId));
    let templeDoc: any = null;

    if (queryId instanceof ObjectId) {
      templeDoc = await collection.findOne({ _id: queryId });
    } else {
      templeDoc = await collection.findOne({
        $or: [{ osm_id: Number(templeId) }, { "tags.name": String(templeId) }]
      });
    }

    if (!templeDoc) {
      res.status(404).json({ ok: false, error: "Temple not found in DB for provided templeId" });
      return;
    }

    const templeNameRaw = templeDoc.name || (templeDoc.tags && templeDoc.tags.name) || String(templeId);
    const folderName = slugify(templeNameRaw);

    // determine extension from fileType or provided filename
    let ext = "jpg";
    if (fileType.includes("png")) ext = "png";
    else if (fileType.includes("gif")) ext = "gif";
    else if (fileType.includes("webp")) ext = "webp";

    // allow filename suggestion from client
    const base = filename ? slugify(String(filename).replace(/\.[^/.]+$/, "")) : null;
    const finalName = base ? `${base}-${Date.now()}.${ext}` : uniqueFileName(ext);

    const blobName = `${folderName}/${finalName}`;

    if (fileData) {
      // Upload file directly to Azure
      console.log(`Uploading file for temple ${templeId} (folder '${folderName}') blob: ${blobName}`);

      const blobServiceClient = await createBlobServiceClient();
      const containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER);
      await containerClient.createIfNotExists();

      const blobClient = containerClient.getBlockBlobClient(blobName);

      // Decode base64 file data
      const buffer = Buffer.from(fileData, 'base64');

      await blobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: fileType
        }
      });

      res.status(200).json({
        ok: true,
        blobName,
        container: AZURE_STORAGE_CONTAINER,
        templeName: templeNameRaw,
        fileName: finalName,
        url: blobClient.url
      });
    } else {
      // Generate presigned URL
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
    }
  } catch (err: any) {
    console.error("upload_temple_photo_azure error:", err);
    const msg = err?.message || "internal error";
    res.status(500).json({ ok: false, error: msg });
  }
}
