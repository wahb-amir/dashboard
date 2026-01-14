// app/models/Session.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  sid: string;
  userAgent?: string;
  ip?: string;
  os?: string;
  browser?: string;
  deviceName?: string;
  fingerprint: string;
  refreshTokenHash?: string;
  revoked?: boolean;
  blocked?: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
}

const SessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  sid: { type: String, required: true, unique: true, index: true },
  userAgent: String,
  ip: String,
  os: String,
  browser: String,
  deviceName: String,
  fingerprint: { type: String, required: true, index: true },
  refreshTokenHash: String,
  revoked: { type: Boolean, default: false, index: true },
  blocked: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: () => new Date() },
  lastUsedAt: Date,
  expiresAt: Date,
});

// Avoid recompilation error in dev hot-reload environments
export default (mongoose.models.Session as mongoose.Model<ISession>) ||
  mongoose.model<ISession>("Session", SessionSchema);
