import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { OwnerEvent } from "../model/ownerEvent.model.js";
import { Auth } from "../model/auth.model.js";

const handlerFilterInput = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const { category, status, startDate, endDate, search } = req.query;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    // We no longer restrict this to owner role
    // if (currentUser.role !== "owner") throw new ApiError(403, "Only owners can filter their events");

    const filter = {}; // Removed ownerId filter to fetch all events

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) filter.startDate.$gte = new Date(startDate);
        if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    if (search) {
        const regex = new RegExp(search, "i"); // case-insensitive search
        filter.$or = [
            { title: regex },
            { organizer: regex },
            { hostedBy: regex },
        ];
    }

    const events = await OwnerEvent.find(filter).sort({ createdAt: -1 }).lean();

    if (!events || events.length === 0) throw new ApiError(404, "No events found matching your criteria");

    return res.status(200).json(new ApiResponse(200, events, "Filtered events fetched successfully"));
});

const handlerAllEvents = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "user") throw new ApiError(403, "Only users are allowed to view events");

    // Fetch all  events
    const events = await OwnerEvent.find().sort({ startDate: -1 });

    if (!events || events.length === 0) {
        return res.status(404).json(new ApiResponse(404, [], "No upcoming events found"));
    }

    return res.status(200).json(new ApiResponse(200, events, "Events fetched successfully"));
});

const handlerPerticularEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "user") throw new ApiError(403, "Only users are allowed to view events");

    const eventId = req.params.id;
    if (!eventId) throw new ApiError(400, "Event ID is required");

    // Fetch the specific event
    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    return res.status(200).json(
        new ApiResponse(200, event, "Event details fetched successfully")
    );
});

const handlerPins = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "user") throw new ApiError(403, "Only users can pin events");

    // Find event to ensure it exists
    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    // Fetch latest user data from DB
    const user = await Auth.findById(currentUser._id);
    if (!user) throw new ApiError(404, "User not found");

    // Initialize pins array if not present
    user.pins = user.pins || [];

    // Check if already pinned
    if (user.pins.includes(eventId)) {
        throw new ApiError(400, "Event already pinned");
    }

    // Add to pins and save
    user.pins.push(eventId);
    await user.save();

    return res.status(200).json(new ApiResponse(200, user.pins, "Event pinned successfully"));
});

const handlerAllPinedEvents = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "user") throw new ApiError(403, "Only users can view pinned events");

    // Fetch the user from DB
    const user = await Auth.findById(currentUser._id).populate("pins");
    if (!user) throw new ApiError(404, "User not found");

    // Check if any pinned events exist
    if (!user.pins || user.pins.length === 0) {
        return res.status(404).json(new ApiResponse(404, [], "No pinned events found"));
    }

    return res.status(200).json(
        new ApiResponse(200, user.pins, "Pinned events fetched successfully")
    );
});

const handlerLike = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "user") throw new ApiError(403, "Only users can like events");

    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    // Initialize likes array if it doesn't exist
    if (!event.likes) event.likes = [];

    // Check if user already liked the event
    const alreadyLiked = event.likes.some(
        (id) => id.toString() === currentUser._id.toString()
    );

    if (alreadyLiked) {
        // Unlike: remove user's id from likes
        event.likes = event.likes.filter(
            (id) => id.toString() !== currentUser._id.toString()
        );
        await event.save();

        return res
            .status(200)
            .json(new ApiResponse(200, event, "Event unliked successfully"));
    } else {
        // Like: add user's id to likes
        event.likes.push(currentUser._id);
        await event.save();

        return res
            .status(200)
            .json(new ApiResponse(200, event, "Event liked successfully"));
    }
});


export {
    handlerAllEvents,
    handlerPerticularEvent,
    handlerFilterInput,
    handlerPins,
    handlerAllPinedEvents,
    handlerLike
}