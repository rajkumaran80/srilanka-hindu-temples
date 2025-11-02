// src/run.ts
import "dotenv/config";
import { textSearchTemplesSriLanka, getPlaceDetails, downloadPhoto } from "./google";
import { toFolderBase, fileSlug, buildCdnUrl } from "./utils";
import { ensureUniqueFolder, upsertFile } from "./github";
import { mongoConnect, mongoClose } from "./mongo";

const CDN_BASE = process.env.CDN_BASE!; // e.g. jsDelivr base

// const MAX_TEMPLES = 100;
const MAX_PHOTOS_PER_TEMPLE = 5;

async function processOne(placeId: string) {
  const details = await getPlaceDetails(placeId);
  const name = details.name;
  const folderBase = toFolderBase(name);          // e.g. "thirukoneswaram_temple"
  const folder = await ensureUniqueFolder(folderBase);   // e.g. "thirukoneswaram_temple_001"
  const baseSlug = fileSlug(name.replace(/ temple$/i, "")); // "thirukoneswaram"
  const location = details.formatted_address ?? "";
  const lat = details.geometry?.location?.lat ?? null;
  const lng = details.geometry?.location?.lng ?? null;

  const photoRefs = (details.photos ?? [])
  .slice(0, MAX_PHOTOS_PER_TEMPLE)
  .map(p => p.photo_reference);

  const photoUrls: string[] = [];

  let index = 1;
  for (const ref of photoRefs) {
    const buf = await downloadPhoto(ref, 1280);
    const filename = `${baseSlug}-temple-${index}.jpg`;
    const path = `photos/${folder}/${filename}`;

    console.log(path);

    await upsertFile(path, buf, `feat: add ${name} photo ${index}`);
    photoUrls.push(buildCdnUrl(CDN_BASE, path));
    index++;
  }

  // Build Mongo doc (add your own fields as needed)
  return {
    name,
    latitude: lat,
    longitude: lng,
    description: "", // you can enrich later
    photos: photoUrls,
    location,
    // you can keep folder/path references too if you want
    repo_folder: folder,
    place_id: placeId,
  };
}

async function main() {
  const coll = await mongoConnect();

  // tile centers to cover Sri Lanka; tweak/add more tiles if you want finer coverage
  const tiles: { lat: number; lng: number }[] = [
    { lat: 9.66, lng: 80.02 }, // Jaffna / North
    { lat: 8.35, lng: 80.40 }, // Anuradhapura area
    { lat: 8.56, lng: 81.23 }, // Trincomalee
    { lat: 7.29, lng: 80.64 }, // Kandy
    { lat: 6.93, lng: 79.85 }, // Colombo / West
    { lat: 7.72, lng: 81.70 }, // Batticaloa / East
    { lat: 5.95, lng: 80.53 }, // Matara / South
  ];

  const fetchedPlaceIds = new Set<string>(); // dedupe across tiles
  let saved = 0;

  for (let t = 0; t < tiles.length; t++) {
    const tile = tiles[t];
    console.log(`\n=== Querying tile ${t + 1}/${tiles.length}: ${tile.lat},${tile.lng} ===`);

    let token: string | undefined = undefined;
    let page = 1;
    const locationParam = `${tile.lat},${tile.lng}`;
    const radius = 100000; // 100 km per tile; adjust if needed

    // For each tile, page through results (max 3 pages per tile)
    do {
      const { results, next_page_token } = await textSearchTemplesSriLanka(token, locationParam, radius);
      token = next_page_token;

      console.log(`Tile ${t + 1} - page ${page} - results: ${results.length} - next_token: ${token ? "yes" : "no"}`);

      // Process results, skipping duplicates across tiles
      for (const r of results) {
        if (!r.place_id) continue;
        if (fetchedPlaceIds.has(r.place_id)) {
          // already processed from another tile or earlier page
          continue;
        }
        fetchedPlaceIds.add(r.place_id);

        try {
          const doc = await processOne(r.place_id);
          await coll.updateOne(
            { place_id: doc.place_id },
            { $set: doc },
            { upsert: true }
          );
          console.log(`Saved: ${doc.name}`);
          saved++;
        } catch (e: any) {
          console.error(`Failed ${r.name}:`, e?.message ?? e);
        }
      }

      // If there's a pagetoken, the API requires a short wait before it becomes valid
      if (token) {
        await new Promise(r => setTimeout(r, 2000));
        page++;
      }
    } while (token);

    // small pause between tiles to be polite and avoid quota bursts
    await new Promise(r => setTimeout(r, 500));

  }

  console.log(`\nFinished. Total saved: ${saved}`);
  await mongoClose();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
