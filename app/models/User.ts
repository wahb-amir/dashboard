import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { hashPassword } from "@/app/utils/hash";

interface LoginRecord {
  deviceId: string;
  fingerprint: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  contactEmail?: string;
  contactEmailVerified?: boolean;
  contactEmailVerifiedAt?: Date | null;
  pendingContactEmail?: string;
  pendingContactEmailToken?: string;
  pendingContactEmailTokenExpires?: Date | null;
  password: string;
  company?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  refreshVersion: number;

  resetCode?: string;
  resetCodeExpires?: Date | null;

  verificationCode?: string;
  verificationCodeExpires?: Date | null;

  contactEmailToken?: string;
  contactEmailTokenExpires?: Date | null;

  lastLogin: LoginRecord[];

  comparePassword(plain: string): Promise<boolean>;

  // helper methods for contact email update flow
  getEffectiveContactEmail(): string;
  setPendingContactEmail(email: string, ttlHours?: number): Promise<string>;
  verifyPendingContactEmail(token: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    contactEmail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      default: "",
      validate: {
        validator: function (v: string) {
          return v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email",
      },
    },
    lastLogin: {
      type: [
        {
          deviceId: { type: String, required: true },
          fingerprint: { type: String, required: true },
          ip: { type: String, required: true },
          userAgent: { type: String },
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // whether the contactEmail has been verified (true only after successful verification)
    contactEmailVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    contactEmailVerifiedAt: {
      type: Date,
      required: false,
      default: null,
    },
    // when a user requests to change their contact email we store the new value here
    pendingContactEmail: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      default: "",
    },
    // token & expiry for verifying the pendingContactEmail
    pendingContactEmailToken: {
      type: String,
      required: false,
      default: "",
    },
    pendingContactEmailTokenExpires: {
      type: Date,
      required: false,
      default: null,
    },
    password: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: false,
      default: "",
    },
    role: {
      type: String,
      default: "client",
      enum: ["client", "admin"],
    },
    refreshVersion: {
      required: true,
      type: Number,
      default: 0,
    },
    resetCode: {
      type: String,
      default: "",
      required: false,
    },
    resetCodeExpires: {
      type: Date,
      default: null,
      required: false,
    },
    verificationCode: {
      type: String,
      default: "",
      required: false,
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
      required: false,
    },
    // legacy or alternative contact token fields (kept for backward compatibility if used elsewhere)
    contactEmailToken: {
      type: String,
      required: false,
      default: "",
    },
    contactEmailTokenExpires: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        // remove sensitive token fields from API responses
        Reflect.deleteProperty(ret, "password");
        Reflect.deleteProperty(ret, "__v");
        Reflect.deleteProperty(ret, "pendingContactEmailToken");
        Reflect.deleteProperty(ret, "pendingContactEmailTokenExpires");
        Reflect.deleteProperty(ret, "contactEmailToken");
        Reflect.deleteProperty(ret, "contactEmailTokenExpires");

        ret.id = ret._id?.toString();
        Reflect.deleteProperty(ret, "_id");
      },
    },
  }
);

// Hash password when created or modified
UserSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;

  try {
    const hashed = await hashPassword(this.password);
    this.password = hashed;
  } catch (err) {
    throw err;
  }
});

// comparePassword implementation
UserSchema.methods.comparePassword = async function (
  this: IUser,
  plain: string
) {
  return bcrypt.compare(plain, this.password);
};

// Return the effective contact email to be used by the app:
// - If contactEmail is present and verified => use contactEmail
// - Otherwise fall back to login email (this.email)
UserSchema.methods.getEffectiveContactEmail = function (this: IUser) {
  if (this.contactEmail && this.contactEmailVerified) return this.contactEmail;
  if (this.email) return this.email;
  return "";
};

// Start the pending contact-email flow. This will store the requested email on the
// document, create a one-time token and expiry, save the doc and return the token so
// you can send a verification link to the pending email.
UserSchema.methods.setPendingContactEmail = async function (
  this: IUser,
  email: string,
  ttlHours = 24
) {
  const sanitized = (email || "").toLowerCase().trim();
  if (!sanitized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    throw new Error("Invalid email");
  }

  const token = crypto.randomBytes(24).toString("hex");
  this.pendingContactEmail = sanitized;
  this.pendingContactEmailToken = token;
  this.pendingContactEmailTokenExpires = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000
  );

  // When user requests a change, mark contactEmailVerified false until they verify
  this.contactEmailVerified = false;

  await this.save();
  return token;
};

// Verify and apply pending contact email. Returns true if successful, false otherwise.
UserSchema.methods.verifyPendingContactEmail = async function (
  this: IUser,
  token: string
) {
  if (!token) return false;
  if (!this.pendingContactEmailToken || this.pendingContactEmailToken !== token)
    return false;
  if (
    !this.pendingContactEmailTokenExpires ||
    this.pendingContactEmailTokenExpires < new Date()
  )
    return false;

  // apply the pending email
  this.contactEmail = this.pendingContactEmail;
  this.contactEmailVerified = true;
  this.contactEmailVerifiedAt = new Date();

  // clear pending fields
  this.pendingContactEmail = "";
  this.pendingContactEmailToken = "";
  this.pendingContactEmailTokenExpires = null;

  await this.save();
  return true;
};


// Prevent model recompilation in dev/hot-reload environments
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
