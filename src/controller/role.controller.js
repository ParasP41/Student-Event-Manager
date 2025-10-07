import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import nodemailer from 'nodemailer';
import { Auth } from '../model/auth.model.js';


const handlerOwnerRoleSwitch = asyncHandler(async (req, res) => {
    const currentLoggedInUser = req.user;
    if (!currentLoggedInUser) {
        throw new ApiError(401, "Please login to continue");
    }

    if (currentLoggedInUser.role === "owner" || currentLoggedInUser.ownerCode !== null) {
        throw new ApiError(401, "Already an owner");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_PASS,
        },
    });

    // Send request notification to admin
    await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: "Ownership Request",
        text: `${currentLoggedInUser.email} has requested to become an owner.`,
    });

    // Generate ownership code
    const ownerCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update user: role becomes owner + save the code
    const user = await Auth.findByIdAndUpdate(
        currentLoggedInUser._id,
        { $set: { ownerCode: ownerCode, role: "owner" } },
        { new: true, runValidators: true }
    ).select('-password');

    // Send code to user
    await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: user.email,
        subject: "Ownership Approval Code",
        text: `Hi ${user.userName}, your ownership code is: ${user.ownerCode}`,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Request sent successfully. You are now an owner."));
});


const handlerUserRoleSwitch = asyncHandler(async (req, res) => {
    const currentLoggedInUser = req.user;
    if (!currentLoggedInUser) {
        throw new ApiError(401, "Please login to continue");
    }

    if (currentLoggedInUser.role === "user" || currentLoggedInUser.ownerCode === null) {
        throw new ApiError(401, "Already a Normal User");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_PASS,
        },
    });

    // Notify admin
    await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: process.env.ADMIN_EMAIL,
        subject: "NormalUser Request",
        text: `${currentLoggedInUser.email} has requested to become a Normal User.`,
    });

    // Update user in DB
    const user = await Auth.findByIdAndUpdate(
        currentLoggedInUser._id,
        { $set: { ownerCode: null, role: "user" } },
        { new: true, runValidators: true }
    ).select('-password');

    // Email to user
    await transporter.sendMail({
        from: process.env.ADMIN_EMAIL,
        to: user.email,
        subject: "Switched To Normal User",
        text: `Hi ${user.userName}, your role has been changed to Normal User.`,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Request sent successfully. You are now a Normal User."));
});


export { handlerOwnerRoleSwitch, handlerUserRoleSwitch };