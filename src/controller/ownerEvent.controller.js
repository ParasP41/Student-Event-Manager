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
        if (!value || (typeof value === "string" && value.trim() === "")) {
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


const handlerDeleteEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;
    // 🔐 Verify logged-in user
    if (!currentUser) {
        throw new ApiError(401, "Please login to continue");
    }

    // 🧾 Verify role
    if (currentUser.role !== "owner") {
        throw new ApiError(403, "Only owners can delete events");
    }

    // ⚠️ Check if event exists
    const event = await OwnerEvent.findById(eventId);
    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    // 🔒 Ensure owner can only delete their own events
    if (event.ownerId.toString() !== currentUser._id.toString()) {
        throw new ApiError(403, "You can only delete your own events");
    }

    if (!currentUser.createdEvents.map(id => id.toString()).includes(event._id.toString())) {
        throw new ApiError(403, "You can only delete events that you created");
    }

    // 🗑 Delete event
    await OwnerEvent.findByIdAndDelete(eventId);

    // 🔄 Remove event ID from owner's createdEvents array
    await Auth.findByIdAndUpdate(currentUser._id, {
        $pull: { createdEvents: eventId }
    });

    // ✅ Respond
    return res.status(200).json(
        new ApiResponse(200, null, "Event deleted successfully")
    );
});

const handlerUpdateEvent = asyncHandler(async (req, res) => {
    res.send("working");
});

export { handlerAddEvent, handlerDeleteEvent, handlerUpdateEvent };
