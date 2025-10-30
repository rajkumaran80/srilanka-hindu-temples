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

export async function textSearchTemplesSriLanka(pageToken?: string) {
  const url = new URL(`${API}/textsearch/json`);
  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("query", "hindu temples in Sri Lanka");
  }
  url.searchParams.set("key", key);

  const res = await fetch(url);
  const data = await res.json();
  if (!["OK", "ZERO_RESULTS"].includes(data.status)) {
    throw new Error(`Text Search: ${data.status} ${data.error_message ?? ""}`);
  }
  return { results: data.results as PlaceBasic[], next_page_token: data.next_page_token as string | undefined };
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
