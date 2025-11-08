// src/osm-to-mongo.ts
import "dotenv/config";
import fetch from "node-fetch";
import { fetchOsmTemples } from "./osm";
import { getWikidataImages, extractImageUrlsFromTags } from "./wikidata";
import { mongoConnect, mongoClose } from "./mongo";
import { toFolderBase, fileSlug, buildCdnUrl } from "./utils";
import { ensureUniqueFolder, upsertFile } from "./github";

const CDN_BASE = process.env.CDN_BASE!;
const MAX_PHOTOS_PER_TEMPLE = Number(process.env.MAX_PHOTOS_PER_TEMPLE ?? 3);
const DOWNLOAD_PHOTOS = process.env.DOWNLOAD_PHOTOS !== "0"; // default true

type PhotoDoc = {
  cdn_url: string;
  source_url: string;
  license?: string | null;
  artist?: string | null;
};

type OsmImportedDoc = {
  name: string;
  latitude: number;
  longitude: number;
  osm_id: number;
  osm_type: "node" | "way" | "relation";
  tags: Record<string, string>;
  source: "osm";
  photos?: PhotoDoc[]; // CDN + metadata
  added_at: Date;
};

async function commonsGeosearch(lat: number, lon: number, radiusMeters = 1000): Promise<Array<{ pageid: number; title: string }>> {
  const endpoint = "https://commons.wikimedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: String(radiusMeters),
    gslimit: "50",
    format: "json",
    origin: "*",
  });
  const url = `${endpoint}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const body = await res.json();
  const items = (body.query?.geosearch ?? []).map((p: any) => ({ pageid: p.pageid, title: p.title }));
  return items;
}

async function fetchCommonsImageInfoByPageid(pageid: number): Promise<{ url?: string; license?: string; artist?: string } | null> {
  const endpoint = "https://commons.wikimedia.org/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    pageids: String(pageid),
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    format: "json",
    origin: "*",
  });
  const url = `${endpoint}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = await res.json();
  const pages = body.query?.pages;
  if (!pages) return null;
  const page = pages[String(pageid)];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const urlStr: string | undefined = ii.url;
  const ext = ii.extmetadata ?? {};
  const license = ext.LicenseShortName?.value ?? ext.License?.value ?? null;
  // artist might be in Artist or Credit
  const artist = ext.Artist?.value ?? ext.Credit?.value ?? null;
  return { url: urlStr, license, artist };
}

async function downloadAndUploadImagesWithMeta(name: string, imageUrls: string[], imageMeta: { [url: string]: { license?: string | null; artist?: string | null } } = {}): Promise<PhotoDoc[]> {
  const folderBase = toFolderBase(name);
  const folder = await ensureUniqueFolder(folderBase);
  const slug = fileSlug(name);

  const final: PhotoDoc[] = [];
  let idx = 1;

  for (const url of imageUrls.slice(0, MAX_PHOTOS_PER_TEMPLE)) {
    try {
      const res = await fetch(url, { timeout: 120000 } as any);
      if (!res.ok) {
        console.warn(`Image fetch failed ${url} HTTP ${res.status}`);
        continue;
      }
      const arr = new Uint8Array(await res.arrayBuffer());
      const buf = Buffer.from(arr);
      // derive extension from content-type or url
      const contentType = res.headers.get("content-type") ?? "";
      let ext = (contentType.split("/").pop() || "").split(";")[0];
      if (!ext) {
        const m = url.match(/\.(jpe?g|png|webp|gif|svg)(?:[\?\#]|$)/i);
        ext = m ? m[1] : "jpg";
      }
      ext = ext.replace(/[^a-z0-9]/gi, "") || "jpg";
      const filename = `${slug}-osm-${idx}.${ext}`;
      const path = `photos/${folder}/${filename}`;

      await upsertFile(path, buf, `feat: add ${name} photo ${idx}`);
      const cdn = buildCdnUrl(CDN_BASE, path);
      final.push({
        cdn_url: cdn,
        source_url: url,
        license: imageMeta[url]?.license ?? null,
        artist: imageMeta[url]?.artist ?? null,
      });
      idx++;
      // small pause so GitHub doesn't throttle
      await new Promise((r) => setTimeout(r, 500));
    } catch (e: any) {
      console.warn("Download/upload image failed:", e?.message ?? e);
      continue;
    }
  }

  return final;
}

/**
 * Master helper:
 * - Accepts OSM element coordinates and tags.
 * - Returns candidate image URLs (Wikidata -> tags -> commons geosearch)
 * - Fetches metadata (license/artist) for commons images when possible.
 */
async function findImagesAndMetaForOsm(el: { lat: number; lon: number; tags?: Record<string,string> }): Promise<{ urls: string[]; meta: { [url: string]: { license?: string | null; artist?: string | null } } }> {
  const lat = el.lat;
  const lon = el.lon;
  const tags = el.tags ?? {};

  const candidateUrls: string[] = [];

  // 1) images from tags (image, wikimedia_commons)
  candidateUrls.push(...extractImageUrlsFromTags(tags));

  // 2) Wikidata images (if OSM has wikidata tag)
  if (tags.wikidata) {
    console.log(`Fetching Wikidata images for ${tags.wikidata}`);
    try {
      const wdImgs = await getWikidataImages(tags.wikidata);
      candidateUrls.push(...wdImgs);
      // gentle pause
      await new Promise((r) => setTimeout(r, 150));
    } catch (e) {
      // ignore errors from wikidata lookup
    }
  }

  // Remove duplicates
  let unique = Array.from(new Set(candidateUrls)).filter(Boolean);

  const meta: { [url: string]: { license?: string | null; artist?: string | null } } = {};

  // If we already have candidate urls, attempt to fetch extmetadata for any commons URLs
  if (unique.length > 0) {
    for (const u of unique.slice(0, MAX_PHOTOS_PER_TEMPLE)) {
      // If the URL is on commons.wikimedia.org or Special:FilePath, try to get extmetadata via title or direct fetch
      try {
        // If URL contains /Special:FilePath/filename, derive filename
        if (/commons\.wikimedia\.org\/wiki\/Special:FilePath\//i.test(u)) {
          // we can attempt to fetch the final redirect to get exact file title via HEAD request
          const hdr = await fetch(u, { method: "HEAD" } as any);
          const finalUrl = hdr.headers.get("location") ?? u;
          // finalUrl likely points to upload.wikimedia.org, fallback to storing without metadata
          meta[u] = { license: null, artist: null };
        } else if (/commons\.wikimedia\.org\/wiki\//i.test(u)) {
          // extract title
          const m = u.match(/\/wiki\/(.*)$/i);
          if (m) {
            const title = decodeURIComponent(m[1]);
            // Get imageinfo by title
            const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=extmetadata|url&format=json&origin=*`);
            if (infoRes.ok) {
              const info = await infoRes.json();
              const pages = info.query?.pages ?? {};
              const page = Object.values(pages)[0] as any;
              const ii = page?.imageinfo?.[0];
              if (ii) {
                const license = ii.extmetadata?.LicenseShortName?.value ?? ii.extmetadata?.License?.value ?? null;
                const artist = ii.extmetadata?.Artist?.value ?? ii.extmetadata?.Credit?.value ?? null;
                const imageUrl = ii.url ?? u;
                meta[imageUrl] = { license, artist };
                // prefer canonical imageUrl in place of original u if provided
                unique = unique.map(x => x === u ? imageUrl : x);
              } else {
                meta[u] = { license: null, artist: null };
              }
            } else {
              meta[u] = { license: null, artist: null };
            }
          } else {
            meta[u] = { license: null, artist: null };
          }
        } else {
          // non-commons url, leave meta null
          meta[u] = { license: null, artist: null };
        }
      } catch {
        meta[u] = { license: null, artist: null };
      }
    }
  }

  // If none found yet, try commons geosearch near the coordinates as fallback
  if (unique.length === 0) {
    try {
      const commonsResults = await commonsGeosearch(lat, lon, 1500);
      for (const cr of commonsResults) {
        try {
          const info = await fetchCommonsImageInfoByPageid(cr.pageid);
          if (info?.url) {
            unique.push(info.url);
            meta[info.url] = { license: info.license ?? null, artist: info.artist ?? null };
          }
          // small pause
          await new Promise((r) => setTimeout(r, 150));
        } catch {
          continue;
        }
      }
    } catch (e) {
      // ignore commons errors
    }
  }

  // Ensure unique again and return
  unique = Array.from(new Set(unique)).filter(Boolean);
  return { urls: unique, meta };
}

export async function importOsmTemplesToMongo() {
  const coll = await mongoConnect();
  console.log("Fetching OSM temples (this may take a while)...");
  const elements = await fetchOsmTemples();
  console.log(`Fetched ${elements.length} OSM elements`);

  let added = 0;
  for (const el of elements) {
    console.log(`Processing element ${el.type}/${el.id}`);
    console.log(`element:`, JSON.stringify(el));

    const tags = el.tags ?? {};
    const name = tags.name ?? `unnamed_temple_${el.id}`;
    // Determine coordinates: prefer node lat/lon; otherwise use center
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) {
      console.warn(`Skipping element without coords: ${el.type}/${el.id}`);
      continue;
    }

    // better dedupe: try by osm_id first, then by coordinates +/- small epsilon
    const existsByOsm = await coll.findOne({ osm_id: el.id });
    const coordExists = await coll.findOne({
      latitude: { $gte: lat - 0.0003, $lte: lat + 0.0003 },
      longitude: { $gte: lon - 0.0003, $lte: lon + 0.0003 },
    });

    if (existsByOsm || coordExists) {
      console.log(`Already in DB (skip): ${name} (${el.type}/${el.id})`);
      continue;
    }

    // Collect candidate image URLs & metadata
    const { urls: uniqueImgs, meta } = await findImagesAndMetaForOsm({ lat, lon, tags });

    // Optionally download/upload images
    let photoDocs: PhotoDoc[] = [];
    if (DOWNLOAD_PHOTOS && uniqueImgs.length) {
      photoDocs = await downloadAndUploadImagesWithMeta(name, uniqueImgs, meta);
    }

    const doc: OsmImportedDoc = {
      name,
      latitude: lat,
      longitude: lon,
      osm_id: el.id,
      osm_type: el.type,
      tags,
      source: "osm",
      photos: photoDocs,
      added_at: new Date(),
    };

    await coll.updateOne({ osm_id: el.id }, { $set: doc }, { upsert: true });
    added++;
    console.log(`Saved OSM temple: ${name} (${el.id}) with ${photoDocs.length} photos`);

    // Respectful pause to avoid rate-limits
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`Import complete. Added ${added} new OSM temples.`);
  await mongoClose();
}
