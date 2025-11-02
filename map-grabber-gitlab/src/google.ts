// src/google.ts
const API = "https://maps.googleapis.com/maps/api/place";
const key = process.env.GOOGLE_MAPS_API_KEY!;

export type PlaceBasic = {
  name: string;
  place_id: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  photos?: { photo_reference: string }[];
};

export async function textSearchTemplesSriLanka(pageToken?: string, location?: string, radius = 100000) {
  const url = new URL(`${API}/textsearch/json`);

  if (pageToken) {
    // when using a next_page_token, only pagetoken and key are required
    url.searchParams.set("pagetoken", pageToken);
  } else {
    // initial query for this geographic tile: bias towards hindu temples
    url.searchParams.set("query", "hindu temple");
    url.searchParams.set("type", "hindu_temple");
    if (location) {
      url.searchParams.set("location", location);
      url.searchParams.set("radius", String(radius));
    }
  }

  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  const data = await res.json();

  const resultsCount = Array.isArray(data.results) ? data.results.length : 0;
  console.log("Text Search response Temples found (this page):", resultsCount);
  // data.result is likely a typo in original code; log data.results for visibility
  console.log("Text Search response (sample):", data.results && data.results.slice(0, 3));

  if (!["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(`Text Search: ${data.status} ${data.error_message ?? ""}`);
  }

  return {
    results: (data.results ?? []) as PlaceBasic[],
    next_page_token: data.next_page_token as string | undefined
  };
}

export async function getPlaceDetails(placeId: string) {
  const fields = [
    "name",
    "formatted_address",
    "geometry",
    "photos",
    "opening_hours",
    "rating",
    "website",
  ].join(",");
  const url = new URL(`${API}/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", fields);
  url.searchParams.set("key", key);

  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK") throw new Error(`Details: ${data.status} ${data.error_message ?? ""}`);
  return data.result as PlaceBasic & {
    opening_hours?: unknown; rating?: number; website?: string;
  };
}

export async function downloadPhoto(photoRef: string, maxWidth = 1024): Promise<Buffer> {
  // Photo endpoint redirects to actual image; fetch will follow
  const url = new URL(`${API}/photo`);
  url.searchParams.set("maxwidth", String(maxWidth));
  url.searchParams.set("photo_reference", photoRef);
  url.searchParams.set("key", key);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photo fetch HTTP ${res.status}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(arr);
}
