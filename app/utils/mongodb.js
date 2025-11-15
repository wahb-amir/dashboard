// lib/mongodb.js
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
let db;

export default async function connectToDatabase() {
    if (!db) {
        await client.connect();
        db = client.db(process.env.MONGODB_DB || "dashboard");
    }
    return { client, db };
}
