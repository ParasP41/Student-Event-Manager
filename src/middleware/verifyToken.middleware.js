import { asyncHandler } from "../utils/asyncHandler.js";
import { Auth } from "../model/auth.model.js";
import { ApiError } from "../utils/APIError.js";
import jwt from "jsonwebtoken";
const verifyToken = asyncHandler(async (req, res,next) => {
    const token = req.cookies.token;
    if (!token) {
        throw new ApiError(401, "UNAUTHORISED REQUEST : NO TOKEN PROVIDED")
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await Auth.findById(decodedToken._id).select("-password");
    if (!user) {
        throw new ApiError(401, "INVALID ACCESS TOKEN");
    }

    req.user = user;
    next();
})
export { verifyToken }