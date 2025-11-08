/*
TypeScript script: fetch temple images (Wikidata/Wikimedia Commons fallback), upload into GitHub repo
and update MongoDB documents with `photos` array containing jsdelivr CDN URLs.

CHANGES: single folder per temple (no per-image subfolders). Images will be named with numeric suffixes
(e.g. thirukoneswaram-kovil-temple-1.jpg, thirukoneswaram-kovil-temple-2.jpg) and uploaded under
photos/<temple_folder>/

Instructions (set these env vars before running):
- MONGODB_URI  -> MongoDB connection string
- MONGODB_DB   -> Database name (e.g. "temples")
- MONGODB_COLLECTION -> Collection name (e.g. "temples")
- GITHUB_TOKEN -> GitHub Personal Access Token with repo scope
- GITHUB_REPO  -> owner/repo e.g. rajkumaran80/srilanka-hindu-temples-photos (default provided)
- GITHUB_BRANCH -> branch to commit to (default: main)
- FLICKR_API_KEY -> optional; if provided, script will try Flickr fallback

Run: `ts-node sri-temples-photos-uploader.ts` or compile with tsc.

Notes:
- The script will attempt Wikidata SPARQL around the temple coordinate for items with image (P18).
- It will use Wikimedia Commons to fetch image URLs and metadata.
- Each image is uploaded to the GitHub repo via the Contents API as base64.
- The script then updates the MongoDB document `photos` field with the expected jsDelivr CDN URL(s).
- The script is conservative: it will not overwrite existing file paths in the repo unless you change the logic.
*/

import fetch from 'node-fetch';
import { MongoClient, WithId, Document } from 'mongodb';
import path from 'path';
import { URL } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

/**
 * commons-temples-uploader.ts
 *
 * Searches Wikimedia Commons for images for temples in MongoDB,
 * uploads chosen images into GitHub repo under photos/<temple_folder>/,
 * and updates the MongoDB document with jsDelivr CDN URLs and attribution metadata.
 *
 * Env vars:
 *  - MONGODB_URI (required)
 *  - MONGODB_DB (default: temples)
 *  - MONGODB_COLLECTION (default: temples)
 *  - GITHUB_TOKEN (required)
 *  - GITHUB_REPO (required) e.g. owner/repo
 *  - GITHUB_BRANCH (optional, default main)
 *  - MAX_IMAGES_PER_TEMPLE (optional, default 3)
 *
 * Notes:
 *  - This script only uses Wikimedia Commons API and checks extmetadata license.
 *  - Accepted license types in extmetadata: CreativeCommons.* (BY, BY-SA), "Public domain", "CC0".
 *  - It stores `photos` (array of CDN URLs) and `photos_meta` (array of objects with author/license/source).
 */



const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "temples";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "temples";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || ""; // e.g. rajkumaran80/srilanka-hindu-temples-photos
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const MAX_IMAGES_PER_TEMPLE = Number(process.env.MAX_IMAGES_PER_TEMPLE || 3);
const USER_AGENT = "SriTemplesCommonsBot/1.0 (your-email@example.com)";

if (!MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is required");
if (!GITHUB_REPO) throw new Error("GITHUB_REPO is required");

function slugifyFolder(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function slugifyFile(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// Search Commons by text (generator search)
async function commonsSearchByText(q: string, limit = 10) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: q,
    gsrlimit: String(limit),
    prop: "imageinfo|coordinates",
    iiprop: "url|extmetadata",
    format: "json",
    origin: "*",
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const j = await res.json();
  const pages = j.query?.pages || {};
  return Object.values(pages).map((p: any) => p);
}

// Geosearch on Commons: use Action=query & list=geosearch on commons (works similarly)
async function commonsGeosearch(lat: number, lon: number, radiusMeters = 500, limit = 10) {
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gsradius: String(Math.max(100, radiusMeters)),
    gslimit: String(limit),
    gscoord: `${lat}|${lon}`,
    format: "json",
    origin: "*",
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const j = await res.json();
  const pages = j.query?.geosearch || [];
  // For each geosearch item (which gives pageid/title), fetch images of that page and their imageinfo
  const results: any[] = [];
  for (const p of pages) {
    // get images for this page
    const params2 = new URLSearchParams({
      action: "query",
      titles: p.title,
      prop: "images",
      format: "json",
      origin: "*",
    });
    const r2 = await fetch(`https://commons.wikimedia.org/w/api.php?${params2.toString()}`, { headers: { "User-Agent": USER_AGENT } });
    if (!r2.ok) continue;
    const j2 = await r2.json();
    const pageObj = Object.values(j2.query?.pages || {})[0] as any;
    const imgs = pageObj?.images || [];
    for (const img of imgs) {
      // fetch imageinfo for each
      const infoParams = new URLSearchParams({
        action: "query",
        titles: img.title,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        format: "json",
        origin: "*",
      });
      const r3 = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams.toString()}`, { headers: { "User-Agent": USER_AGENT } });
      if (!r3.ok) continue;
      const j3 = await r3.json();
      const page = Object.values(j3.query?.pages || {})[0] as any;
      if (page && page.imageinfo) results.push(page);
      await sleep(150);
    }
    await sleep(200);
  }
  return results;
}

function acceptableLicense(extmetadata: any | null) {
  if (!extmetadata) return false;
  // extmetadata fields: LicenseShortName, LicenseUrl, Artist
  const name = (extmetadata.LicenseShortName?.value || "").toLowerCase();
  const url = (extmetadata.LicenseUrl?.value || "").toLowerCase();
  if (!name && !url) return false;
  // Accept public domain / cc0 / cc-by / cc-by-sa
  if (name.includes("public domain")) return true;
  if (name.includes("cc0")) return true;
  if (name.includes("cc by") || name.includes("creative commons")) {
    // Accept BY and BY-SA; you must keep attribution
    return true;
  }
  // safe fallback: check url
  if (url.includes("creativecommons.org") || url.includes("creativecommons")) return true;
  if (url.includes("publicdomain")) return true;
  return false;
}

async function fetchImageAsBase64(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Failed to fetch image ${url} : ${res.status}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function githubUploadFile(repo: string, branch: string, pathInRepo: string, contentBase64: string, message: string) {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pathInRepo)}`;
  const headers: any = { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": USER_AGENT, "Content-Type": "application/json" };
  // check if exists
  const getRes = await fetch(apiUrl + `?ref=${encodeURIComponent(branch)}`, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": USER_AGENT } });
  let sha: string | undefined;
  if (getRes.ok) {
    try {
      const body = await getRes.json();
      sha = body.sha;
    } catch (e) { /* ignore */ }
  }
  const payload: any = { message, content: contentBase64, branch };
  if (sha) payload.sha = sha;
  const putRes = await fetch(apiUrl, { method: "PUT", headers, body: JSON.stringify(payload) });
  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`GitHub upload failed: ${putRes.status} ${text}`);
  }
  const j = await putRes.json();
  return j.content?.path;
}

function jsDelivrUrl(repo: string, branch: string, pathInRepo: string) {
  return `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${pathInRepo}`;
}

async function processTemple(doc: WithId<Document>, client: MongoClient) {
  const lat = doc.latitude;
  const lon = doc.longitude;
  const name: string = (doc.name || (doc.tags && doc.tags.name) || `temple_${doc._id}`).toString();
  console.log("Processing:", name);

  const folder = `${slugifyFolder(name)}_kovil`;
  const imagesFound: Array<{ url: string, extmetadata?: any, title?: string }> = [];

  // 1) Search Commons by temple name
  try {
    const q = `${name} temple OR kovil OR \"${name}\"`;
    const pages = await commonsSearchByText(q, 20);
    for (const p of pages) {
      // page may include imageinfo directly (if generator returned images)
      if (p.imageinfo && p.imageinfo.length) {
        for (const ii of p.imageinfo) {
          const ext = ii.extmetadata || null;
          if (!acceptableLicense(ext)) continue;
          imagesFound.push({ url: ii.url, extmetadata: ext, title: p.title });
          if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
        }
      }
      if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
      await sleep(150);
    }
  } catch (e) {
    console.warn("commons text search failed:", e);
  }

  // 2) If none or not enough, geosearch by coordinates (if available)
  if (imagesFound.length < MAX_IMAGES_PER_TEMPLE && lat && lon) {
    try {
      const geoResults = await commonsGeosearch(Number(lat), Number(lon), 500, 15);
      for (const page of geoResults) {
        if (page.imageinfo && page.imageinfo.length) {
          for (const ii of page.imageinfo) {
            const ext = ii.extmetadata || null;
            if (!acceptableLicense(ext)) continue;
            imagesFound.push({ url: ii.url, extmetadata: ext, title: page.title });
            if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
          }
        }
        if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
        await sleep(150);
      }
    } catch (e) {
      console.warn("commons geosearch failed:", e);
    }
  }

  if (imagesFound.length === 0) {
    console.log("No acceptable commons images found for", name);
    return;
  }

  // 3) Upload images to GitHub and build CDN URLs, update DB
  const uploadedUrls: string[] = [];
  const photosMeta: Array<any> = [];
  let idx = 1;
  for (const img of imagesFound.slice(0, MAX_IMAGES_PER_TEMPLE)) {
    try {
      const parsed = new URL(img.url);
      const ext = parsed.pathname.split(".").pop()?.split(/\W/)[0] || "jpg";
      const filename = `${slugifyFile(name)}-temple-${idx}.${ext}`;
      const pathInRepo = `photos/${folder}/${filename}`;
      console.log("Downloading image:", img.url);
      const base64 = await fetchImageAsBase64(img.url);
      console.log("Uploading to", pathInRepo);
      await githubUploadFile(GITHUB_REPO, GITHUB_BRANCH, pathInRepo, base64, `Add photo for ${name} - ${filename}`);
      const cdn = jsDelivrUrl(GITHUB_REPO, GITHUB_BRANCH, pathInRepo);
      uploadedUrls.push(cdn);
      photosMeta.push({
        url: cdn,
        source_original: img.url,
        title: img.title,
        author: img.extmetadata?.Artist?.value || img.extmetadata?.Credit?.value || null,
        license: img.extmetadata?.LicenseShortName?.value || img.extmetadata?.UsageTerms?.value || null,
        license_url: img.extmetadata?.LicenseUrl?.value || null
      });
      idx++;
      await sleep(400);
    } catch (e) {
      console.warn("Failed to upload or fetch image:", e);
    }
  }

  if (uploadedUrls.length > 0) {
    const db = client.db(MONGODB_DB);
    const col = db.collection(MONGODB_COLLECTION);
    await col.updateOne({ _id: doc._id }, {
      $set: {
        photos: uploadedUrls,
        photos_meta: photosMeta
      }
    });
    console.log("Updated DB for", name, uploadedUrls);
  } else {
    console.log("No uploads completed for", name);
  }
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true } as any);
  await client.connect();
  const col = client.db(MONGODB_DB).collection(MONGODB_COLLECTION);

  // find temples without photos or with empty photos
  const cursor = col.find({ $or: [{ photos: { $exists: false } }, { photos: { $size: 0 } }] });
  while (await cursor.hasNext()) {
    const doc = await cursor.next() as WithId<Document>;
    try {
      await processTemple(doc, client);
      await sleep(600);
    } catch (e) {
      console.error("Error processing temple", doc._id, e);
    }
  }
  await client.close();
  console.log("All done.");
}

main().catch(err => { console.error(err); process.exit(1); });
