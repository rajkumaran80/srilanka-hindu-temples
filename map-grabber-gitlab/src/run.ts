// src/run.ts
import "dotenv/config";
import { textSearchTemplesSriLanka, getPlaceDetails, downloadPhoto } from "./google";
import { toFolderBase, fileSlug, buildCdnUrl } from "./utils";
import { ensureUniqueFolder, upsertFile } from "./github";
import { mongoConnect, mongoClose } from "./mongo";

const CDN_BASE = process.env.CDN_BASE!; // e.g. jsDelivr base

const MAX_TEMPLES = 100;
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

  let token: string | undefined;
  let page = 1;
  let saved = 0;

  do {
    const { results, next_page_token } = await textSearchTemplesSriLanka(token);

    for (const r of results) {
      if (saved >= MAX_TEMPLES) break;           // ✅ hard stop

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
        console.error(`Failed ${r.name}:`, e.message);
      }
    }

    if (saved >= MAX_TEMPLES) break;             // ✅ stop before paging
    token = next_page_token;

    if (token) {
      await new Promise(r => setTimeout(r, 2000)); // required before using next_page_token
      page++;
    }
  } while (token);

  await mongoClose();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
