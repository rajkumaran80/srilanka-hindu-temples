// src/run-location-enricher.ts
import { enrichTemplesWithLocation } from "./temple-location-enricher";

async function main() {
  try {
    await enrichTemplesWithLocation();
  } catch (e: any) {
    console.error("Location enrichment failed:", e?.message ?? e);
    process.exit(1);
  }
}

main();
