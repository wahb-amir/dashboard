import mongoose, { Schema } from "mongoose";

const QuoteSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    description: { type: String },
    budget: { type: Number },
    deadline: { type: String }, 
    status: {
      type: String,
      enum: ["pending", "reviewing", "sent", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model("Quote", QuoteSchema);