import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { OwnerEvent } from "../model/ownerEvent.model.js";
import { Auth } from "../model/auth.model.js";


// 🟢 Secure Add Event (Owner Only)
const handlerAddEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    // 🔐 Verify logged-in user
    if (!currentUser) {
        throw new ApiError(401, "Please login to continue");
    }

    // 🧾 Verify role
    if (currentUser.role !== "owner") {
        throw new ApiError(403, "Only owners are allowed to add events");
    }

    const {
        title,
        description,
        category,
        organizer,
        hostedBy,
        startDate,
        endDate,
        registrationDeadline,
        time,//
        mode,
        venue,//
        registrationLink,
        bannerImage,//
        contactInfo,//
        rules,//
    } = req.body;

    // 🧠 Validate all required fields
    const requiredFields = {
        title,
        description,
        category,
        organizer,
        hostedBy,
        startDate,
        endDate,
        registrationDeadline,
        mode,
        registrationLink,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value || value.trim() === "") {
            throw new ApiError(400, `Missing required field: ${key}`);
        }
    }

    // 🕒 Validate Dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const regDeadline = new Date(registrationDeadline);

    if (isNaN(start) || isNaN(end) || isNaN(regDeadline)) {
        throw new ApiError(400, "Invalid date format");
    }

    if (regDeadline > start) {
        throw new ApiError(400, "Registration deadline must be before event start date");
    }

    if (end < start) {
        throw new ApiError(400, "End date cannot be before start date");
    }

    // 🌐 Validate mode
    const allowedModes = ["Online", "Offline", "Hybrid"];
    if (!allowedModes.includes(mode)) {
        throw new ApiError(400, "Mode must be Online, Offline, or Hybrid");
    }

    // 🧩 Create Event
    const newEvent = await OwnerEvent.create({
        ownerId: currentUser._id,
        title,
        description,
        category,
        organizer,
        hostedBy,
        startDate,
        endDate,
        registrationDeadline,
        time,//
        mode,
        venue: venue || "Not specified",//
        registrationLink,
        bannerImage: bannerImage || "",//
        contactInfo: contactInfo || {},//
        rules: rules || [],//
        status: "Upcoming",//
    });

    await Auth.findByIdAndUpdate(
        currentUser._id,
        { $push: { createdEvents: newEvent._id } },
        { new: true, runValidators: true }
    );


    // ✅ Respond
    return res.status(201).json(
        new ApiResponse(201, newEvent, "Event added successfully by owner.")
    );
});



export { handlerAddEvent };
