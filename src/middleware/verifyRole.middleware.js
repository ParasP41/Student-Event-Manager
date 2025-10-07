import { asyncHandler } from "../utils/asyncHandler";

const verifyRole = asyncHandler(async (allowedRoles) => (req, res, next) => {
    const user = req.user;
    if (!user) return next(new ApiError(401, "Please login"));
    if (!allowedRoles.includes(user.role)) return next(new ApiError(403, "You do not have permission"));
    next();
});

export { verifyRole };