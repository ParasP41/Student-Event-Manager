import { Auth } from "../model/auth.model.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import axios from "axios";
import { options } from "../config.js";


const handlerDemo = asyncHandler(async (req, res) => {
    res.send("Working")
})

export { handlerDemo }