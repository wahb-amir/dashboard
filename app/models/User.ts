// app/models/User.ts
import mongoose, { Document, Model, Schema } from "mongoose";
import { hashPassword } from "@/app/utils/hash";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword?: (plain: string) => Promise<boolean>;
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
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "client",
      enum: ["client", "admin"],
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

// Only hash password if it's new or modified
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const hashed = await hashPassword(this.password);
    this.password = hashed;
    next();
  } catch (err) {
    next(err as any);
  }
});

UserSchema.methods.comparePassword = async function (plain: string) {
  throw new Error("comparePassword not implemented - use your compare util");
};

// Prevent model recompilation in dev/hot-reload environments
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
