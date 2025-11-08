// src/run-osm.ts
import { importOsmTemplesToMongo } from "./osm-to-mongo";

async function main() {
  try {
    await importOsmTemplesToMongo();
  } catch (e: any) {
    console.error("Run failed:", e?.message ?? e);
    process.exit(1);
  }
}

main();
