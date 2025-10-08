import mongoose from "mongoose";

const ownerEventSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Auth",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        organizer: {
            type: String,
            required: true,
            trim: true,
        },
        hostedBy: {
            type: String,
            required: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        registrationDeadline: {
            type: Date,
            required: true,
        },
        time: {
            type: String,
            trim: true,
        },
        mode: {
            type: String,
            enum: ["Online", "Offline", "Hybrid"],
            required: true,
        },
        venue: {
            type: String,
            trim: true,
        },
        registrationLink: {
            type: String,
            required: true,
            trim: true,
        },
        bannerImage: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
            default: "Upcoming",
        },
        contactInfo: {
            name: {
                type: String,
                trim: true,
            },
            email: {
                type: String,
                trim: true,
                lowercase: true,
            },
            phone: {
                type: String,
                trim: true,
            },
        },
        rules: [
            {
                type: String,
                trim: true,
            },
        ],
    },
    { timestamps: true }
);

export const OwnerEvent = mongoose.model("OwnerEvent", ownerEventSchema);
