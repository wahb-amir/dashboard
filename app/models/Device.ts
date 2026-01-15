import mongoose, { Schema, Document, Model, HydratedDocument } from "mongoose";

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

// 1. Define the interface for the document
export interface IDevice {
  userId: string;
  deviceId: string;
  fingerprintHash?: string | null;
  ua?: string | null;
  deviceType: DeviceType;
  trustScore: number;
  revoked: boolean;
  blocked: boolean;
  approved: boolean;
  lastSeen?: Date | null;
  seenCount: number;
  failedAuthCount: number;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the interface for the Model (to support static methods)
interface IDeviceModel extends Model<IDevice> {
  findByFingerprint(userId: string, fpHash: string): Promise<HydratedDocument<IDevice> | null>;
}

const DeviceSchema = new Schema<IDevice, IDeviceModel>(
  {
    userId: { type: String, required: true, index: true },
    deviceId: { type: String, required: true, index: true },
    fingerprintHash: { type: String, default: null, index: true },
    ua: { type: String, default: null },
    deviceType: { type: String, default: "unknown" },
    trustScore: { type: Number, default: 50 },
    revoked: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
    seenCount: { type: Number, default: 0 },
    failedAuthCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { 
    timestamps: true 
  }
);

DeviceSchema.statics.findByFingerprint = function (userId: string, fpHash: string) {
  return this.findOne({ userId, fingerprintHash: fpHash });
};

// 4. Handle HMR (Hot Module Replacement) for development
const Device = (mongoose.models.Device as IDeviceModel) || 
               mongoose.model<IDevice, IDeviceModel>("Device", DeviceSchema);

export default Device;