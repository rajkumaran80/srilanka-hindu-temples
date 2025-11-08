// src/wikidata.ts
import fetch from "node-fetch";

type WikidataClaimsResponse = {
  claims: Record<string, any[]>;
};

// Get P18 (image) claims from Wikidata entity (Q-id)
export async function getWikidataImages(qid: string): Promise<string[]> {
  try {
    // wbgetclaims endpoint for property P18 (image)
    const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${encodeURIComponent(qid)}&property=P18&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as WikidataClaimsResponse;
    const claims = data.claims?.P18 ?? [];
    const filenames: string[] = [];

    for (const claim of claims) {
      const val = claim.mainsnak?.datavalue?.value;
      if (typeof val === "string") filenames.push(val);
    }

    // Convert Wikimedia filename to direct FilePath URL
    const fileUrls = filenames.map((fn) =>
      `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fn)}`
    );

    return fileUrls;
  } catch (e) {
    return [];
  }
}

// Fallback: fetch images listed on the OSM tags (image, wikimedia_commons)
export function extractImageUrlsFromTags(tags?: Record<string, string>): string[] {
  if (!tags) return [];
  const candidates: string[] = [];
  if (tags.image) candidates.push(tags.image);
  if (tags.wikimedia_commons) candidates.push(tags.wikimedia_commons);
  if (tags["image:url"]) candidates.push(tags["image:url"]);
  return candidates;
}
