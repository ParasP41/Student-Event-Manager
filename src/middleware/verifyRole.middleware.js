import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyRole = (allowedRoles) =>
  asyncHandler(async (req, res, next) => {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, "Please login");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ApiError(403, "You do not have permission");
    }

    next();
  });

export { verifyRole };