import { Auth } from "../model/auth.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";


const options = {
    httpOnly: true,
    secure: true, // set true in production (HTTPS)
};

const handlerSignUp = asyncHandler(async (req, res) => {
    const { firstName, lastName, userName, email, password, confirm_password } = req.body;

    // 1. Check required fields
    if (!firstName || !lastName || !userName || !email || !password || !confirm_password) {
        throw new ApiError(400, "All fields are required");
    }

    // 2. Check confirm password
    if (confirm_password !== password) {
        throw new ApiError(400, "Passwords do not match");
    }

    // 3. Check if user already exists
    const existingUser = await Auth.findOne({
        $or: [{ userName }, { email }],
    });

    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create new user
    const user = await Auth.create({
        firstName,
        lastName,
        userName,
        email,
        password: hashedPassword,
    });

    // 6. Fetch user without password
    const createdUser = await Auth.findById(user._id).select("-password");

    // 7. Create JWT token
    const token = await jwt.sign(
        {
            _id: user._id,
            email: user.email,
            username: user.userName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );

    // 8. Send response
    return res
        .status(201)
        .cookie("token", token, options)
        .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const handlerLogin = asyncHandler(async (req, res) => {

    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(400, "REQUIRED FIELD IS MISSING ( email, password )");
    }

    const user = await Auth.findOne({ email });

    if (!user) {
        throw new ApiError(401, "INVALID EMAIL OR PASSWORD");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
        throw new ApiError(401, "INVALID EMAIL OR PASSWORD");
    }

    const loggedUser = await Auth.findById(user._id).select("-password");

    const token = jwt.sign(
        {
            _id: user._id,
            email: user.email,
            username: user.userName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );

    return res.status(200)
        .cookie("token", token, options)
        .json(new ApiResponse(200, loggedUser, "USER LOGGED IN SUCCESSFULLY"));

})

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

const handlerUpdateProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName, userName, email, password } = req.body;

    if (!firstName || !lastName || !userName || !email) {
        throw new ApiError(400, "REQUIRED FIELD IS MISSING ( firstName, lastName, username, email )");
    }

    const currentLoggedInUser = req.user;
    const user = await Auth.findById(currentLoggedInUser._id);
    if (!user) {
        throw new ApiError(404, "USER NOT FOUND");
    }

    if (password) {
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            throw new ApiError(401, "INVALID PASSWORD");
        }
    }

    let pictureUrl = user.picture;
    if (req.file && req.file.path) {
        const picture = await uploadOnCloudinary(req.file.path);
        if (!picture) {
            throw new ApiError(400, "CLOUDINARY UPLOAD FAILED");
        }
        pictureUrl = picture.url;
    }

    const updatedUser = await Auth.findByIdAndUpdate(
        currentLoggedInUser._id,
        {
            firstName,
            lastName,
            email,
            userName,
            picture: pictureUrl,
        },
        { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "USER PROFILE UPDATED")
    );
});


export {
    handlerSignUp,
    handlerLogin,
    handlerLogOut,
    handlerUpdateProfile
};
