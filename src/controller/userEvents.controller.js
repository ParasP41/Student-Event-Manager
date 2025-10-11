import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { OwnerEvent } from "../model/ownerEvent.model.js";
import { Auth } from "../model/auth.model.js";
import { Comment } from "../model/comment.model.js";

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

const handlerAddComment = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;
    const { text } = req.body; // ✅ Correct way to extract text from body

    // Authentication check
    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "user") throw new ApiError(403, "Only users can add comments");

    // Validation
    if (!eventId) throw new ApiError(400, "Event ID is required");
    if (!text || typeof text !== "string" || text.trim() === "") {
        throw new ApiError(400, "Valid comment text is required");
    }

    // Check if the event exists
    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    // Create a new comment
    const comment = await Comment.create({
        eventId,
        userId: currentUser._id,
        text: text.trim(),
    });

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment added successfully")
    );
});

const handlerFindEventComment = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    // Authentication check
    if (!currentUser) throw new ApiError(401, "Please login to continue");

    // Validate eventId
    if (!eventId) throw new ApiError(400, "Event ID is required");

    // Check if event exists
    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    // Find all comments for the event
    const comments = await Comment.find({ eventId })
        .populate("userId", "name email picture") // show basic user info
        .sort({ createdAt: -1 }); // latest comments first

    if (!comments || comments.length === 0) {
        return res
            .status(404)
            .json(new ApiResponse(404, [], "No comments found for this event"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const handlerDeleteComment = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const commentId = req.params.id;

    // Authentication check
    if (!currentUser) throw new ApiError(401, "Please login to continue");

    // Validate commentId
    if (!commentId) throw new ApiError(400, "Comment ID is required");

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    // Only the user who created the comment can delete it
    if (comment.userId.toString() !== currentUser._id.toString()) {
        throw new ApiError(403, "You can only delete your own comments");
    }

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

const handlerEditComment = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const commentId = req.params.id;
    const { text } = req.body;

    // Authentication check
    if (!currentUser) throw new ApiError(401, "Please login to continue");

    // Validate input
    if (!commentId) throw new ApiError(400, "Comment ID is required");
    if (!text || typeof text !== "string" || text.trim() === "") {
        throw new ApiError(400, "Valid comment text is required");
    }

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    // Only owner can edit
    if (comment.userId.toString() !== currentUser._id.toString()) {
        throw new ApiError(403, "You can only edit your own comments");
    }

    // Update the comment
    comment.text = text.trim();
    comment.isEdited = true; // optional, you can add this field in your schema if desired
    await comment.save();

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment updated successfully"));
});


export {
    handlerAllEvents,
    handlerPerticularEvent,
    handlerFilterInput,
    handlerPins,
    handlerAllPinedEvents,
    handlerLike,
    handlerAddComment,
    handlerFindEventComment,
    handlerDeleteComment,
    handlerEditComment,

}