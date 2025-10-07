import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import nodemailer from "nodemailer";
import { Auth } from "../model/auth.model.js";
import { options } from "../config.js";
import bcrypt from "bcrypt";

// Create a reusable transporter to avoid multiple creations
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,
  },
});

const handlerOwnerRoleSwitch = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  if (!currentUser) throw new ApiError(401, "Please login to continue");

  if (currentUser.role === "owner" || currentUser.ownerCode !== null) {
    throw new ApiError(400, "You are already an owner");
  }

  // Generate hashed ownership code
  const rawOwnerCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOwnerCode = await bcrypt.hash(rawOwnerCode, 10);

  // Update user role & ownerCode
  const updatedUser = await Auth.findByIdAndUpdate(
    currentUser._id,
    { $set: { ownerCode: hashedOwnerCode, role: "owner" } },
    { new: true, runValidators: true }
  ).select("-password");

  try {
    // Notify admin
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "Ownership Request",
      text: `${currentUser.email} has requested to become an owner.`,
    });

    // Send owner code to user
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: updatedUser.email,
      subject: "Ownership Approval Code",
      text: `Hi ${updatedUser.userName}, your ownership code is: ${rawOwnerCode}`,
    });
  } catch (err) {
    console.error("Email sending failed:", err.message);
  }

  return res
    .status(200)
    .cookie("token", "", options)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Ownership activated successfully. Please log in again."
      )
    );
});

const handlerUserRoleSwitch = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  if (!currentUser) throw new ApiError(401, "Please login to continue");

  if (currentUser.role === "user" || currentUser.ownerCode === null) {
    throw new ApiError(400, "You are already a normal user");
  }

  // Update role to user & remove ownerCode
  const updatedUser = await Auth.findByIdAndUpdate(
    currentUser._id,
    { $set: { ownerCode: null, role: "user" } },
    { new: true, runValidators: true }
  ).select("-password");

  try {
    // Notify admin
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "Normal User Request",
      text: `${currentUser.email} has requested to become a normal user.`,
    });

    // Notify user
    await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to: updatedUser.email,
      subject: "Switched to Normal User",
      text: `Hi ${updatedUser.userName}, your role has been changed to Normal User.`,
    });
  } catch (err) {
    console.error("Email sending failed:", err.message);
  }

  return res
    .status(200)
    .cookie("token", "", options)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Role changed to Normal User. Please log in again."
      )
    );
});

export { handlerOwnerRoleSwitch, handlerUserRoleSwitch };
