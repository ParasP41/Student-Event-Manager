import mongoose from "mongoose";

const authSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        userName: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true
        },
        picture: {
            type: String,
            default: ""
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true
        },
        password: {
            type: String,
            trim: true,
            required: true,
        },
    },
    { timestamps: true }
);

export const Auth = mongoose.model('Auth', authSchema);