// src/temple-location-enricher.ts
import "dotenv/config";
import fetch from "node-fetch";
import { mongoConnect, mongoClose } from "./mongo";

type TempleDoc = {
  _id?: any;
  name: string;
  latitude: number;
  longitude: number;
  location?: string;
  village?: string;
  suburb?: string;
  district?: string;
  [key: string]: any;
};

type NominatimResponse = Array<{
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  address?: {
    village?: string;
    suburb?: string;
    town?: string;
    city?: string;
    county?: string;
    state_district?: string;
    state?: string;
    [key: string]: string | undefined;
  };
}>;

async function reverseGeocode(lat: number, lon: number): Promise<{ village?: string; suburb?: string; district?: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SriLankaTempleLocator/1.0'
      }
    });

    if (!res.ok) {
      console.warn(`Nominatim API error: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json() as NominatimResponse[0];

    if (!data || !data.address) {
      return null;
    }

    const address = data.address;

    // Extract location information
    // In Sri Lanka context:
    // - village: smallest administrative unit
    // - suburb: could be a neighborhood or sub-area
    // - district: administrative district
    const village = address.village || address.town || address.city;
    const suburb = address.suburb || address.neighbourhood;
    const district = address.state_district || address.county || address.state;

    return {
      village: village || undefined,
      suburb: suburb || undefined,
      district: district || undefined
    };
  } catch (error) {
    console.warn(`Reverse geocoding failed for ${lat},${lon}:`, error);
    return null;
  }
}

export async function enrichTemplesWithLocation() {
  const coll = await mongoConnect();

  console.log("Fetching all temples from database...");
  const temples = await coll.find({}).toArray();
  console.log(`Found ${temples.length} temples to process`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const temple of temples) {
    const doc = temple as TempleDoc;

    // Skip if no coordinates
    if (!doc.latitude || !doc.longitude) {
      console.log(`Skipping ${doc.name}: no coordinates`);
      skipped++;
      continue;
    }

    // Skip if already has location data
    if (doc.village || doc.suburb || doc.district) {
      console.log(`Skipping ${doc.name}: already has location data`);
      skipped++;
      continue;
    }

    console.log(`Processing ${doc.name} at ${doc.latitude},${doc.longitude}`);

    // Reverse geocode
    const locationData = await reverseGeocode(doc.latitude, doc.longitude);

    if (locationData) {
      const updateData: Partial<TempleDoc> = {};
      if (locationData.village) updateData.village = locationData.village;
      if (locationData.suburb) updateData.suburb = locationData.suburb;
      if (locationData.district) updateData.district = locationData.district;

      await coll.updateOne(
        { _id: doc._id },
        { $set: updateData }
      );

      console.log(`Updated ${doc.name}: village=${locationData.village}, suburb=${locationData.suburb}, district=${locationData.district}`);
      updated++;
    } else {
      console.log(`Failed to get location data for ${doc.name}`);
      errors++;
    }

    // Respectful pause to avoid rate limiting (Nominatim allows 1 request per second)
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  console.log(`\nEnrichment complete:`);
  console.log(`- Updated: ${updated}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Errors: ${errors}`);

  await mongoClose();
}
