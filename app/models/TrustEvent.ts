import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITrustEvent extends Document {
  userId: string;
  sid?: string | null;
  ip?: string | null;
  ua?: string | null;
  score: number;
  reasons: string[];
  createdAt: Date;
}

const TrustEventSchema = new Schema<ITrustEvent>({
  userId: { type: String, required: true },
  sid: { type: String, default: null },
  ip: { type: String, default: null },
  ua: { type: String, default: null },
  score: { type: Number, required: true },
  reasons: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

// prevent recompiling model in dev hot reload
const TrustEvent: Model<ITrustEvent> =
  mongoose.models.TrustEvent || mongoose.model("TrustEvent", TrustEventSchema);

export default TrustEvent;
