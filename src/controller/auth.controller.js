import { Auth } from "../model/auth.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import axios from "axios";
import { options } from "../config.js";
import { verifyNumber } from "../utils/verifyNumber.js";

const handlerSignUp = asyncHandler(async (req, res) => {
  const { firstName, lastName, userName, email, password, confirm_password, phoneNumber } = req.body;

  // 1️⃣ Validate all fields
  if (!firstName || !lastName || !userName || !email || !password || !confirm_password || !phoneNumber) {
    throw new ApiError(400, "All fields are required");
  }

  // 2️⃣ Validate phone number with Numverify API
  //   const response = await axios.get(
  //     `https://apilayer.net/api/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=${phoneNumber}`
  //   );
  //   const data = response.data;

  //   if (!data.valid || data.line_type !== "mobile") {
  //     throw new ApiError(400, "Enter a valid mobile number");
  //   }

  await verifyNumber(phoneNumber);

  // 3️⃣ Check passwords match
  if (confirm_password !== password) {
    throw new ApiError(400, "Passwords do not match");
  }

  // 4️⃣ Check if user already exists
  const existingUser = await Auth.findOne({
    $or: [{ userName }, { email }],
  });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  // 5️⃣ Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 6️⃣ Create user
  const user = await Auth.create({
    firstName,
    lastName,
    userName,
    email,
    phoneNumber,
    password: hashedPassword,
  });

  // 7️⃣ Generate JWT token
  const token = jwt.sign(
    { _id: user._id, email: user.email, username: user.userName },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  // 8️⃣ Send response
  const createdUser = await Auth.findById(user._id).select("-password");
  return res
    .status(201)
    .cookie("token", token, options)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const handlerLogin = asyncHandler(async (req, res) => {
  const { email, password, ownerCode } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "REQUIRED FIELD IS MISSING (email, password)");
  }

  // Find user
  const user = await Auth.findOne({ email });
  if (!user) {
    throw new ApiError(401, "INVALID EMAIL OR PASSWORD");
  }

  // If user is an owner, require ownerCode
  if (user.role === "owner") {
    if (!ownerCode) {
      throw new ApiError(400, "OWNER CODE IS REQUIRED FOR OWNER LOGIN");
    }
    if (user.ownerCode !== ownerCode) {
      throw new ApiError(401, "INVALID OWNER CODE");
    }
  }

  // Check password
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(401, "INVALID EMAIL OR PASSWORD");
  }

  const loggedUser = await Auth.findById(user._id).select("-password");

  // Generate JWT token
  const token = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      username: user.userName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  return res.status(200)
    .cookie("token", token, options)
    .json(new ApiResponse(200, loggedUser, "USER LOGGED IN SUCCESSFULLY"));
});

const handlerLogOut = asyncHandler(async (req, res) => {
  const loggedOutUser = req.user;

  return res.status(200)
    .cookie("token", "", options)
    .json(
      new ApiResponse(
        200,
        { loggedOutUser },
        "USER LOGGED OUT SUCCESSFULLY"
      )
    );
});

const handlerDeleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const currentLoggedInUser = req.user;

  if (!currentLoggedInUser) {
    throw new ApiError(401, "Please login to continue");
  }

  // Find the user in DB
  const user = await Auth.findById(currentLoggedInUser._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Incorrect password");
  }

  // Delete user account
  await Auth.findByIdAndDelete(currentLoggedInUser._id);

  return res.status(200)
    .cookie("token", "", options)
    .json(
      new ApiResponse(
        200,
        null,
        "Account deleted successfully"
      )
    );
})

const handlerUpdateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, userName, email, phoneNumber, password } = req.body;

  // if (!firstName || !lastName || !userName || !email) {
  //   throw new ApiError(400, "REQUIRED FIELD IS MISSING (firstName, lastName, userName, email)");
  // }

  // 2️⃣ Validate phone number with Numverify API
  const response = await axios.get(
    `https://apilayer.net/api/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=${phoneNumber}`
  );
  const data = response.data;

  if (!data.valid || data.line_type !== "mobile") {
    throw new ApiError(400, "Enter a valid mobile number");
  }


  const currentLoggedInUser = req.user;
  const user = await Auth.findById(currentLoggedInUser._id);
  if (!user) {
    throw new ApiError(404, "USER NOT FOUND");
  }



  let requirePasswordVerification = false;

  // ✅ If user is changing email or username, ask for password
  if (email !== user.email || userName !== user.userName || phoneNumber !== user.phoneNumber) {
    requirePasswordVerification = true;
  }

  if (requirePasswordVerification) {
    if (!password) {
      throw new ApiError(400, "Password is required to change email or username");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Incorrect password");
    }

    // Check for duplicate email
    if (email !== user.email) {
      const emailExist = await Auth.findOne({ email });
      if (emailExist) throw new ApiError(400, "Email already in use");
    }

    // Check for duplicate username
    if (userName !== user.userName) {
      const usernameExist = await Auth.findOne({ userName });
      if (usernameExist) throw new ApiError(400, "Username already in use");
    }

    if (phoneNumber !== user.phoneNumber) {
      const phoneNumberExist = await Auth.findOne({ phoneNumber });
       if (phoneNumberExist) throw new ApiError(400, "Phone Number already in use");
       await verifyNumber(phoneNumber);
    }


  }

  // ✅ Handle picture update
  let pictureUrl = user.picture;
  if (req.file && req.file.path) {
    const picture = await uploadOnCloudinary(req.file.path);
    if (!picture) throw new ApiError(400, "CLOUDINARY UPLOAD FAILED");
    pictureUrl = picture.url;
  }

  // ✅ Update user details
  const updatedUser = await Auth.findByIdAndUpdate(
    currentLoggedInUser._id,
    {
      firstName,
      lastName,
      email,
      userName,
      phoneNumber: phoneNumber || user.phoneNumber,
      picture: pictureUrl,
    },
    { new: true, runValidators: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "USER PROFILE UPDATED SUCCESSFULLY"));
});

const handlerUpdatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "REQUIRED FIELD IS MISSING (oldPassword , newPassword)");
  }
  const currentLoggedInUser = req.user;
  if (!currentLoggedInUser) {
    throw new ApiError(401, "Please login to continue");
  }

  const user = await Auth.findById(currentLoggedInUser._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(400, "Old password is incorrect");
  }


  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new ApiError(400, "New password cannot be the same as the old password");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const updatedUser = await Auth.findByIdAndUpdate(
    user._id,
    { $set: { password: hashedPassword } },
    { new: true, runValidators: true }
  ).select('-password');

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Password updated successfully")
  );
});

const handlerSentOTP = asyncHandler(async (req, res) => {
  const currentLoggedInUser = req.user;

  if (!currentLoggedInUser) {
    throw new ApiError(401, "Please login to continue");
  }

  if (!currentLoggedInUser.phoneNumber) {
    throw new ApiError(400, "Phone number not found in your profile. Please update your profile first.");
  }

  // Make sure phone number is in correct format: 10 digits, no leading 0 or +
  let phone = currentLoggedInUser.phoneNumber.replace(/^(\+91|0)/, '');

  try {
    const sendOTP = await axios.post(
      "https://api.msg91.com/api/v5/otp",
      {
        template_id: process.env.TEMPLATE_ID,
        mobile: `91${phone}`,
        otp_length: 6
      },
      {
        headers: {
          authkey: process.env.AUTHKEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = sendOTP.data;

    if (data.type !== "success") {
      throw new ApiError(400, "OTP failed to send: " + data.message);
    }

    return res.status(200).json(
      new ApiResponse(200, data, "OTP sent successfully")
    );

  } catch (err) {
    console.error("Error sending OTP:", err.sendOTP?.data || err.message);
    throw new ApiError(500, "Something went wrong while sending OTP");
  }
});

const handlerVerifyAndUpdatePassword = asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body;

  if (!otp || !newPassword) {
    throw new ApiError(400, "All fields are required");
  }

  const currentLoggedInUser = req.user;

  if (!currentLoggedInUser) {
    throw new ApiError(401, "Please login to continue");
  }

  if (!currentLoggedInUser.phoneNumber) {
    throw new ApiError(400, "Phone number not found in your profile. Please update your profile first.");
  }

  // Verify OTP
  const VerifyOTP = await axios.post(
    "https://api.msg91.com/api/v5/otp/verify",
    {
      mobile: `91${currentLoggedInUser.phoneNumber}`,
      otp: otp,
      authkey: process.env.AUTHKEY
    }
  );

  if (VerifyOTP.data.type !== "success") {
    throw new ApiError(400, "OTP is wrong or expired");
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password in DB
  const updatedUser = await Auth.findByIdAndUpdate(
    currentLoggedInUser._id,
    { $set: { password: hashedPassword } },
    { new: true, runValidators: true }
  ).select('-password');

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Password updated successfully")
  );
});

export {
  handlerSignUp,
  handlerLogin,
  handlerLogOut,
  handlerDeleteAccount,
  handlerUpdateProfile,
  handlerUpdatePassword,
  handlerSentOTP,
  handlerVerifyAndUpdatePassword
};
