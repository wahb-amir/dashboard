import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { hashPassword } from "@/app/utils/hash";

export interface IUser extends Document {
  name: string;
  email: string; // login email
  contactEmail?: string; // separate contact email
  password: string;
  company?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  refreshVersion: number;
  resetCode?: string;
  resetCodeExpires?: Date | null;
  verficationCode?: string;
  verficationCodeExpires?: Date | null;
  comparePassword(plain: string): Promise<boolean>;
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
    verficationCode: {
      type: String,
      default: "",
      required: false,
    },
    verficationCodeExpires: {
      type: Date,
      default: null,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        Reflect.deleteProperty(ret, "password");
        Reflect.deleteProperty(ret, "__v");
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

// TTL index for resetCodeExpires (documents where resetCodeExpires is set and older than now will be removed)
// Note: TTL index removes the entire document when the indexed date is older than now.
// If you only want to expire the code, prefer manual expiry checks and cleanup.
UserSchema.index({ resetCodeExpires: 1 }, { expireAfterSeconds: 0 });
UserSchema.index({ verficationCodeExpires: 1 }, { expireAfterSeconds: 0 });
// Prevent model recompilation in dev/hot-reload environments
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
