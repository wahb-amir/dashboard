import mongoose, { Schema, Document, Model, Types } from "mongoose";

/* =====================
   Interfaces
===================== */

export interface IStep {
  id: string;
  step: string;
  date?: string;
  data?: Record<string, unknown>;
  status: "pending" | "in-progress" | "Completed" | "completed" | "done";
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date; // optional to satisfy strict checks
}

export interface IDeveloper {
  name: string;
  portfolio?: string | null;
}

export interface IVersion {
  versionId: string;
  snapshot: Record<string, unknown>;
  createdAt?: Date;
  createdBy: string;
}

/**
 * IProject extends Document. createdAt/updatedAt are optional because
 * Mongoose adds them when `timestamps: true`.
 */
export interface IProject extends Document {
  userId: string;
  title: string;
  company?: string | null;
  description?: string;
  dueDate?: Date | null;
  email?: string | null;
  contactName?: string | null;
  steps: IStep[];
  currentFocus: string;
  status: "pending" | "active" | "completed" | "cancelled";
  developers: IDeveloper[];
  versions: IVersion[];
  createdAt?: Date;
  updatedAt?: Date;
}

/* =====================
   Schemas
===================== */

const StepSchema = new Schema<IStep>(
  {
    id: { type: String, required: true },
    step: { type: String, required: true, trim: true, default: "Step" },
    date: { type: String },
    data: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "in-progress", "Completed", "completed", "done"],
      default: "pending",
    },
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const DeveloperSchema = new Schema<IDeveloper>(
  {
    name: { type: String, required: true, trim: true },
    portfolio: { type: String, default: null },
  },
  { _id: false }
);

const VersionSchema = new Schema<IVersion>(
  {
    versionId: { type: String, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: () => new Date() },
    createdBy: { type: String, required: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, default: null },
    dueDate: { type: Date, default: null },
    email: { type: String, default: null },
    contactName: { type: String, default: null },
    description: { type: String, default: "" },
    steps: { type: [StepSchema], default: [] },
    currentFocus: {
      type: String,
      default: "New quote request received.",
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
    },
    developers: { type: [DeveloperSchema], default: [] },
    versions: { type: [VersionSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      /**
       * Properly type the transform args to satisfy strict mode.
       * Use safe guards around ret._id before converting.
       */
      transform(doc: mongoose.Document, ret: Record<string, any>) {
        if (ret && ret._id !== undefined && ret._id !== null) {
          // ensure safe string conversion
          ret.id = String(ret._id);
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* =====================
   Model
===================== */

/**
 * Avoid TS error when reading mongoose.models['Project']:
 * cast existing model to Model<IProject> if present.
 */
const existingModel =
  (mongoose.models && (mongoose.models["Project"] as Model<IProject>)) ||
  undefined;

const Project: Model<IProject> =
  existingModel || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
