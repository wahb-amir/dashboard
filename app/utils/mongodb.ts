// app/utils/mongodb.ts
import mongoose from "mongoose";


declare global {
  // allow caching across hot reloads in dev
  // eslint-disable-next-line no-var
  var __mongo_cache__:
    | {
        conn: mongoose.Mongoose | null;
        promise: Promise<mongoose.Mongoose | null> | null;
      }
    | undefined;
}

const DEFAULT_DB = "dashboard";

function getEnvVar(name: string): string | undefined {
  return process.env[name];
}

export default async function connectToDatabase(opts?: {
  retries?: number;
  retryDelayMs?: number;
}): Promise<mongoose.Mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI ?? getEnvVar("MONGODB_URI");
  const DB_NAME = process.env.DB_NAME ?? getEnvVar("DB_NAME") ?? DEFAULT_DB;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define MONGODB_URI in your environment variables (e.g. .env.local)."
    );
  }

  if (!global.__mongo_cache__) {
    global.__mongo_cache__ = { conn: null, promise: null };
  }

  if (global.__mongo_cache__.conn) {
    return global.__mongo_cache__.conn!;
  }

  if (global.__mongo_cache__.promise) {
    return global.__mongo_cache__.promise!;
  }

  const retries = opts?.retries ?? 3;
  const retryDelayMs = opts?.retryDelayMs ?? 1000;

  const connectWithRetry = async (): Promise<mongoose.Mongoose> => {
    // Updated connect options — removed useNewUrlParser/useUnifiedTopology
    const connectOptions: mongoose.ConnectOptions = {
      dbName: DB_NAME,
      // Optional helpful settings:
      // maxPoolSize: 10,
      // serverSelectionTimeoutMS: 5000,
      // autoIndex: process.env.NODE_ENV !== "production",
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `[mongo] connecting to (db: ${DB_NAME}) attempt ${attempt}`
        );
        const conn = await mongoose.connect(MONGODB_URI, connectOptions);
        // mongoose.connect returns mongoose.Mongoose
        global.__mongo_cache__!.conn = conn;
        global.__mongo_cache__!.promise = null;
        console.log("[mongo] connected");
        return conn;
      } catch (err: any) {
        console.error(
          `[mongo] connection attempt ${attempt} failed:`,
          err?.message ?? err
        );
        global.__mongo_cache__!.promise = null;

        if (attempt === retries) {
          const e = new Error(
            `Failed to connect to MongoDB after ${retries} attempts. Last error: ${
              err?.message ?? err
            }`
          );
          (e as any).cause = err;
          throw e;
        }

        await new Promise((res) => setTimeout(res, retryDelayMs * attempt));
      }
    }
    throw new Error("Unexpected MongoDB connection error");
  };

  global.__mongo_cache__.promise = connectWithRetry();
  return global.__mongo_cache__.promise!;
}
