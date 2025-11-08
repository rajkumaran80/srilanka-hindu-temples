// src/mongo.ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB!;
const collName = process.env.MONGODB_COLLECTION!;

let client: MongoClient;

export async function mongoConnect() {
  client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName).collection(collName);
}

export async function mongoClose() {
  if (client) await client.close();
}
