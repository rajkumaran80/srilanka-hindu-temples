// src/osm.ts
import fetch from "node-fetch";

export type OsmElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type OverpassResponse = {
  elements: Array<{
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>;
};

const OVERPASS_URL = process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

// Query to get all Hindu temples in Sri Lanka (nodes/ways/relations).
// Uses the country area for Sri Lanka.
export function buildSriLankaOverpassQuery(): string {
  return `
    [out:json][timeout:180];
    area["ISO3166-1"="LK"]->.country;
    (
      node["amenity"="place_of_worship"]["religion"="hindu"](area.country);
      way["amenity"="place_of_worship"]["religion"="hindu"](area.country);
      relation["amenity"="place_of_worship"]["religion"="hindu"](area.country);
    );
    out center meta;
  `;
}

export async function fetchOsmTemples(): Promise<OsmElement[]> {
  const query = buildSriLankaOverpassQuery();
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`;

  const res = await fetch(url, { timeout: 180000 } as any);
  if (!res.ok) {
    throw new Error(`Overpass API HTTP ${res.status}`);
  }
  const data = (await res.json()) as OverpassResponse;
  const elements: OsmElement[] = (data.elements ?? []).map((el: any) => ({
    id: el.id,
    type: el.type,
    lat: el.lat,
    lon: el.lon,
    center: el.center ? { lat: el.center.lat, lon: el.center.lon } : undefined,
    tags: el.tags ?? {},
  }));
  return elements;
}
