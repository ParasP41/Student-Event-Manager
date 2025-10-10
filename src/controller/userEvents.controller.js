import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { OwnerEvent } from "../model/ownerEvent.model.js";


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



export { handlerAllEvents, handlerPerticularEvent ,handlerFilterInput }