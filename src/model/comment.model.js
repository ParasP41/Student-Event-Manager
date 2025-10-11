import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OwnerEvent", // Reference to event model
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth", // Reference to user model
      required: true,
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      minlength: [1, "Comment cannot be empty"],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

export const Comment = mongoose.model("Comment", commentSchema);
