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

// --- Configuration from env ---
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'temples';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'temples';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'rajkumaran80/srilanka-hindu-temples-photos';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const FLICKR_API_KEY = process.env.FLICKR_API_KEY || '';
const MAX_IMAGES_PER_TEMPLE = Number(process.env.MAX_IMAGES_PER_TEMPLE || 3);
const SPARQL_RADIUS_KM = Number(process.env.SPARQL_RADIUS_KM || 0.5);

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Set it and re-run.');
  process.exit(1);
}
if (!GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN is required. Set it and re-run.');
  process.exit(1);
}

// helper: safe folder/file names
function slugifyFolder(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}
function slugifyFile(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// 1) SPARQL query to Wikidata to find items near coords that have image (P18)
async function queryWikidataForImages(lat: number, lon: number, radiusKm = SPARQL_RADIUS_KM) {
  const sparql = `
SELECT ?item ?itemLabel ?image WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?location .
    bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
  }
  ?item wdt:P18 ?image .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 10
`;
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql);
  const res = await fetch(url, { headers: { 'User-Agent': 'SriTemplesPhotoBot/1.0 (you@example.com)' } });
  if (!res.ok) {
    console.warn('Wikidata SPARQL failed', res.status, await res.text().catch(()=>null));
    return [];
  }
  const json = await res.json();
  const rows = json.results?.bindings || [];
  return rows.map((r: any) => ({ item: r.item.value, label: r.itemLabel.value, image: r.image.value }));
}

// 2) Given a Commons file name or URL, fetch imageinfo (url + license extmetadata)
async function fetchCommonsImageInfo(filenameOrUrl: string) {
  let title = filenameOrUrl;
  try {
    const u = new URL(filenameOrUrl);
    if (u.pathname.includes('/wiki/')) {
      title = decodeURIComponent(u.pathname.split('/wiki/')[1]);
    } else if (u.pathname.includes('/Special:FilePath/')) {
      title = 'File:' + decodeURIComponent(u.pathname.split('/Special:FilePath/')[1]);
    }
  } catch (e) {
    // not a url
  }
  if (!title.startsWith('File:')) {
    if (!title.toLowerCase().startsWith('file:')) title = 'File:' + title;
  }
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    format: 'json'
  });
  const api = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const res = await fetch(api, { headers: { 'User-Agent': 'SriTemplesPhotoBot/1.0 (you@example.com)' } });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = json.query?.pages || {};
  const page = Object.values(pages)[0] as any;
  if (!page || !page.imageinfo) return null;
  const ii = page.imageinfo[0];
  return {
    url: ii.url as string,
    extmetadata: ii.extmetadata || null,
    title: page.title || title
  };
}

// 3) Optional: Flickr fallback (if FLICKR_API_KEY present). Find geo photos with allowed licenses.
async function flickrSearchGeo(lat: number, lon: number, radiusKm = 0.5, perPage = 5) {
  if (!FLICKR_API_KEY) return [];
  const license = '4,5,9,10';
  const params = new URLSearchParams({
    method: 'flickr.photos.search',
    api_key: FLICKR_API_KEY,
    lat: lat.toString(),
    lon: lon.toString(),
    radius: String(Math.max(0.1, radiusKm * 1)),
    per_page: String(perPage),
    format: 'json',
    nojsoncallback: '1',
    license,
    extras: 'owner_name,license,url_o,url_c,url_l,url_m'
  });
  const url = `https://api.flickr.com/services/rest/?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const j = await res.json();
  const photos = j.photos?.photo || [];
  return photos.map((p: any) => ({
    title: p.title,
    owner: p.ownername,
    license: p.license,
    url: p.url_o || p.url_l || p.url_c || p.url_m
  })).filter((p: any) => p.url);
}

// fetch image bytes and return base64
async function fetchImageAsBase64(imageUrl: string) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': 'SriTemplesPhotoBot/1.0 (you@example.com)' } });
  if (!res.ok) throw new Error('Failed to fetch image: ' + res.status);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// upload a base64 file to GitHub using Contents API (creates or updates)
async function githubUploadFile(repo: string, branch: string, pathInRepo: string, contentBase64: string, message: string) {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(pathInRepo)}`;
  const headers = { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'SriTemplesPhotoBot/1.0' };
  let sha: string | undefined;
  const getRes = await fetch(apiUrl + `?ref=${encodeURIComponent(branch)}`, { headers });
  if (getRes.ok) {
    const body = await getRes.json();
    sha = body.sha;
  }
  const payload: any = {
    message,
    content: contentBase64,
    branch
  };
  if (sha) payload.sha = sha; // update existing
  const putRes = await fetch(apiUrl, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error('GitHub upload failed: ' + putRes.status + ' ' + txt);
  }
  const j = await putRes.json();
  return j.content?.path;
}

// Compose jsDelivr CDN URL for uploaded file
function jsDelivrCdnUrl(repo: string, branch: string, pathInRepo: string) {
  return `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${pathInRepo}`;
}

// Main processing per temple document
async function processTemple(doc: WithId<Document>, client: MongoClient) {
  const lat = doc.latitude;
  const lon = doc.longitude;
  const name = doc.name || (doc.tags && doc.tags.name) || `temple_${doc._id}`;
  console.log('Processing:', name, lat, lon);
  // single folder per temple
  const folderBase = slugifyFolder(name) + '_kovil'; // e.g. thirukoneswaram_kovil

  const imagesFound: Array<{src:string, license?: any, title?:string}> = [];

  // 1) Try Wikidata SPARQL
  try {
    const wd = await queryWikidataForImages(lat, lon);
    for (const item of wd) {
      if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
      const info = await fetchCommonsImageInfo(item.image);
      if (info && info.url) {
        imagesFound.push({ src: info.url, license: info.extmetadata, title: info.title });
      }
      await sleep(300);
    }
  } catch (e) { console.warn('Wikidata step failed', e); }

  // 2) If not enough images, try geosearch via Wikipedia Commons (via Wikipedia geosearch + images)
  if (imagesFound.length < MAX_IMAGES_PER_TEMPLE) {
    try {
      const wpParams = new URLSearchParams({ action: 'query', list: 'geosearch', gscoord: `${lat}|${lon}`, gsradius: String(Math.max(100, SPARQL_RADIUS_KM*1000)), gslimit: '10', format: 'json' });
      const wpUrl = `https://en.wikipedia.org/w/api.php?${wpParams.toString()}`;
      const wpRes = await fetch(wpUrl, { headers: { 'User-Agent': 'SriTemplesPhotoBot/1.0' } });
      const wpJson = await wpRes.json();
      const pages = wpJson.query?.geosearch || [];
      for (const p of pages) {
        if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
        const title = p.title;
        const paramsImages = new URLSearchParams({ action: 'query', titles: title, prop: 'images', format: 'json' });
        const ri = await fetch(`https://en.wikipedia.org/w/api.php?${paramsImages.toString()}`, { headers: { 'User-Agent': 'SriTemplesPhotoBot/1.0' } }).then(r=>r.json());
        const pageObj = ri.query?.pages ? Object.values(ri.query.pages)[0] as any : null;
        const imgs = pageObj?.images || [];
        for (const img of imgs) {
          if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
          try {
            const info = await fetchCommonsImageInfo(img.title);
            if (info && info.url) {
              imagesFound.push({ src: info.url, license: info.extmetadata, title: info.title });
            }
          } catch(e){/*ignore*/}
          await sleep(200);
        }
        await sleep(300);
      }
    } catch(e) { console.warn('Wikipedia geosearch failed', e); }
  }

  // 3) Flickr fallback
  if (imagesFound.length < MAX_IMAGES_PER_TEMPLE && FLICKR_API_KEY) {
    try {
      const flickr = await flickrSearchGeo(lat, lon, SPARQL_RADIUS_KM, 10);
      for (const f of flickr) {
        if (imagesFound.length >= MAX_IMAGES_PER_TEMPLE) break;
        imagesFound.push({ src: f.url, title: f.title, license: f.license });
        await sleep(200);
      }
    } catch(e) { console.warn('Flickr fallback failed', e); }
  }

  if (imagesFound.length === 0) {
    console.log('No images found for', name);
    return;
  }

  // upload to GitHub and prepare CDN urls
  const uploadedCdnUrls: string[] = [];
  let index = 1;
  for (const img of imagesFound.slice(0, MAX_IMAGES_PER_TEMPLE)) {
    try {
      const ext = (new URL(img.src).pathname.split('.').pop() || 'jpg').split('?')[0];
      const fileSlugBase = slugifyFile(name) + '-temple-';
      const filename = `${fileSlugBase}${index}.${ext}`; // thirukoneswaram-kovil-temple-1.jpg
      const folderName = `${slugifyFolder(name)}_kovil`; // single folder per temple
      const pathInRepo = `temple_photos/${folderName}/${filename}`;
      console.log('Downloading', img.src);
      const base64 = await fetchImageAsBase64(img.src);
      console.log('Uploading to GitHub:', pathInRepo);
      await githubUploadFile(GITHUB_REPO, GITHUB_BRANCH, pathInRepo, base64, `Add photo for ${name} - ${filename}`);
      const cdn = jsDelivrCdnUrl(GITHUB_REPO, GITHUB_BRANCH, pathInRepo);
      uploadedCdnUrls.push(cdn);
      index++;
      await sleep(500);
    } catch (e) {
      console.warn('Failed to upload one image for', name, e.message || e);
    }
  }

  // 4) Update MongoDB document with photos array (string array of CDN urls)
  if (uploadedCdnUrls.length > 0) {
    const db = client.db(MONGODB_DB);
    const col = db.collection(MONGODB_COLLECTION);
    const update = { $set: { photos: uploadedCdnUrls } };
    await col.updateOne({ _id: doc._id }, update);
    console.log('Updated document with photos:', uploadedCdnUrls);
  }
}

// Main runner
async function main() {
  const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true } as any);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const col = db.collection(MONGODB_COLLECTION);

  // find documents missing photos or with empty photos
  const cursor = col.find({ $or: [ { photos: { $exists: false } }, { photos: { $size: 0 } } ] });
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    try {
      await processTemple(doc as WithId<Document>, client);
      await sleep(500);
    } catch (e) {
      console.error('Error processing temple', doc!._id, e);
    }
  }
  await client.close();
  console.log('Done.');
}

// execute
main().catch(err => { console.error(err); process.exit(1); });
