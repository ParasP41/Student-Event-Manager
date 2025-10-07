import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/APIError.js";

export const isOwner = asyncHandler(async (req, res, next) => {
    const user = req.user; // make sure your auth middleware adds req.user
    if (!user) {
        throw new ApiError(401, "Please login to continue");
    }

    if (user.role !== "owner" || user.ownerCode!==null) {
        throw new ApiError(403, "Only owners can perform this action");
    }

    next();
});