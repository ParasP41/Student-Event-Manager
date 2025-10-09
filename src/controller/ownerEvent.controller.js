import { ApiError } from "../utils/APIError.js";
import { ApiResponse } from "../utils/APIResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { OwnerEvent } from "../model/ownerEvent.model.js";
import { Auth } from "../model/auth.model.js";
import axios from "axios";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { verifyNumber } from "../utils/verifyNumber.js";


const handlerAddEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "owner") throw new ApiError(403, "Only owners are allowed to add events");

    const {
        title,
        description,
        category,
        organizer,
        hostedBy,
        startDate,
        endDate,
        registrationDeadline,
        time,
        mode,
        venue,
        registrationLink,
        bannerImage,
        contactInfo,
        rules,
    } = req.body;

    // Validate required fields
    const requiredFields = { title, description, category, organizer, hostedBy, startDate, endDate, registrationDeadline, mode, registrationLink };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value || (typeof value === "string" && value.trim() === "")) {
            throw new ApiError(400, `Missing required field: ${key}`);
        }
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const regDeadline = new Date(registrationDeadline);
    if (isNaN(start) || isNaN(end) || isNaN(regDeadline)) throw new ApiError(400, "Invalid date format");
    if (regDeadline > start) throw new ApiError(400, "Registration deadline must be before event start date");
    if (end < start) throw new ApiError(400, "End date cannot be before start date");

    // Mode validation
    const allowedModes = ["Online", "Offline", "Hybrid"];
    if (!allowedModes.includes(mode)) throw new ApiError(400, "Mode must be Online, Offline, or Hybrid");

    // Handle banner upload
    let bannerUrl = currentUser.picture || "";
    if (req.file && req.file.path) {
        const picture = await uploadOnCloudinary(req.file.path);
        if (!picture) throw new ApiError(400, "CLOUDINARY UPLOAD FAILED");
        bannerUrl = picture.url;
    }

    // Parse contactInfo and rules
    let parsedContactInfo = {};
    if (contactInfo) {
        try {
            parsedContactInfo = typeof contactInfo === "string" ? JSON.parse(contactInfo) : contactInfo;
        } catch (err) {
            throw new ApiError(400, "Invalid contactInfo format");
        }
    }
    if (!parsedContactInfo.phone) throw new ApiError(400, "Phone number is required in contactInfo");
    await verifyNumber(parsedContactInfo.phone);

    let parsedRules = [];
    if (rules) {
        try {
            parsedRules = typeof rules === "string" ? JSON.parse(rules) : rules;
        } catch (err) {
            throw new ApiError(400, "Invalid rules format");
        }
    }

    // Create Event
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
        time,
        mode,
        venue: venue || "Not specified",
        registrationLink,
        bannerImage: bannerUrl,
        contactInfo: parsedContactInfo,
        rules: parsedRules,
        status: "Upcoming",
    });

    await Auth.findByIdAndUpdate(
        currentUser._id,
        { $push: { createdEvents: newEvent._id } },
        { new: true, runValidators: true }
    );

    return res.status(201).json(new ApiResponse(201, newEvent, "Event added successfully by owner."));
});

const handlerDeleteEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "owner") throw new ApiError(403, "Only owners can delete events");

    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");

    if (event.ownerId.toString() !== currentUser._id.toString()) throw new ApiError(403, "You can only delete your own events");

    await OwnerEvent.findByIdAndDelete(eventId);
    await Auth.findByIdAndUpdate(currentUser._id, { $pull: { createdEvents: eventId } });

    return res.status(200).json(new ApiResponse(200, null, "Event deleted successfully"));
});

const handlerUpdateEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "owner") throw new ApiError(403, "Only owners can update events");
    if (!mongoose.Types.ObjectId.isValid(eventId)) throw new ApiError(400, "Invalid Event ID");

    const event = await OwnerEvent.findById(eventId);
    if (!event) throw new ApiError(404, "Event not found");
    if (event.ownerId.toString() !== currentUser._id.toString()) throw new ApiError(403, "You are not authorized to update this event");

    const {
        title, description, category, organizer, hostedBy, startDate, endDate, registrationDeadline,
        time, mode, venue, registrationLink, bannerImage, contactInfo, rules, status
    } = req.body;

    // Banner upload
    let bannerUrl = event.bannerImage;
    if (req.file && req.file.path) {
        const picture = await uploadOnCloudinary(req.file.path);
        if (!picture) throw new ApiError(400, "Cloudinary upload failed");
        bannerUrl = picture.url;
    }

    // Date validation
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) throw new ApiError(400, "End date cannot be before start date");
    if (registrationDeadline && startDate && new Date(registrationDeadline) > new Date(startDate)) throw new ApiError(400, "Registration deadline must be before event start date");

    // Mode validation
    const allowedModes = ["Online", "Offline", "Hybrid"];
    if (mode && !allowedModes.includes(mode)) throw new ApiError(400, "Mode must be Online, Offline, or Hybrid");

    // Parse contactInfo and rules
    let parsedContactInfo = event.contactInfo || {};
    if (contactInfo) {
        try {
            parsedContactInfo = typeof contactInfo === "string" ? JSON.parse(contactInfo) : contactInfo;
        } catch (err) {
            throw new ApiError(400, "Invalid contactInfo format");
        }
        if (parsedContactInfo.phone && parsedContactInfo.phone !== event.contactInfo?.phone) {
            await verifyNumber(parsedContactInfo.phone);
        }
    }

    let parsedRules = event.rules || [];
    if (rules) {
        try {
            parsedRules = typeof rules === "string" ? JSON.parse(rules) : rules;
        } catch (err) {
            throw new ApiError(400, "Invalid rules format");
        }
    }

    // Update Event
    const updatedEvent = await OwnerEvent.findByIdAndUpdate(
        eventId,
        {
            $set: {
                title: title ?? event.title,
                description: description ?? event.description,
                category: category ?? event.category,
                organizer: organizer ?? event.organizer,
                hostedBy: hostedBy ?? event.hostedBy,
                startDate: startDate ?? event.startDate,
                endDate: endDate ?? event.endDate,
                registrationDeadline: registrationDeadline ?? event.registrationDeadline,
                time: time ?? event.time,
                mode: mode ?? event.mode,
                venue: venue ?? event.venue,
                registrationLink: registrationLink ?? event.registrationLink,
                bannerImage: bannerUrl,
                contactInfo: parsedContactInfo ?? event.contactInfo,
                rules: parsedRules ?? event.rules,
                status: status ?? event.status,
            },
        },
        { new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedEvent, "Event updated successfully."));
});

const handlerOwnerEvents = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  if (!currentUser) throw new ApiError(401, "Please login to continue");
  if (currentUser.role !== "owner") throw new ApiError(403, "Only owners can view their events");

  // Fetch all events for the owner
  const events = await OwnerEvent.find({ ownerId: currentUser._id }).sort({ createdAt: -1 });

  if (!events || events.length === 0) throw new ApiError(404, "No events found for this owner");

  const now = new Date();

  // Auto-update status based on current date
  for (const event of events) {
    let updatedStatus = event.status;

    if (now < event.startDate) {
      updatedStatus = "upcoming";
    } else if (now >= event.startDate && now <= event.endDate) {
      updatedStatus = "ongoing";
    } else if (now > event.endDate) {
      updatedStatus = "finished";
    }

    // Update in DB only if changed
    if (updatedStatus !== event.status) {
      event.status = updatedStatus;
      await event.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, events, "Owner events fetched and updated successfully."));
});

const handlerFindOneOwnerEvent = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    const eventId = req.params.id;

    // 🔐 Verify login
    if (!currentUser) throw new ApiError(401, "Please login to continue");

    // 🧾 Verify role
    if (currentUser.role !== "owner") throw new ApiError(403, "Only owners can view their events");

    // 🧠 Validate Event ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) throw new ApiError(400, "Invalid Event ID");

    // 🔍 Find Event
    const event = await OwnerEvent.findById(eventId).lean();
    if (!event) throw new ApiError(404, "Event not found");

    // 🚫 Ensure event belongs to current user
    if (event.ownerId.toString() !== currentUser._id.toString()) {
        throw new ApiError(403, "You are not authorized to view this event");
    }

    // ✅ Respond
    return res.status(200).json(
        new ApiResponse(200, event, "Owner event fetched successfully")
    );
});

const handlerFilterInput = asyncHandler(async (req, res) => {
   const currentUser = req.user;
    const { category, status, startDate, endDate, search } = req.query;

    if (!currentUser) throw new ApiError(401, "Please login to continue");
    if (currentUser.role !== "owner") throw new ApiError(403, "Only owners can filter their events");

    const filter = { ownerId: currentUser._id };

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

export {
    handlerAddEvent,
    handlerDeleteEvent,
    handlerUpdateEvent,
    handlerOwnerEvents,
    handlerFindOneOwnerEvent,
    handlerFilterInput
};
