import mongoose, { isValidObjectId } from "mongoose";
import { Event } from "../models/event.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc    Create a new event
 * @route   POST /api/v1/events
 * @access  Private (Organizer or Admin)
*/
const createEvent = asyncHandler(async(req, res) => {
    const {
        title,
        description,
        eventType,
        startTime,
        endTime,
        speakers, //should be an array of user objectIds
        maxAttendees,
    } = req.body;

    const organizerId = req.user?._id;

    if(!title || !description || !startTime || !endTime) {
        throw new ApiError(400, 'title, description, startTime and endTime are required');
    }

    //convert times to date objects for validation
    const start = new Date(startTime);
    const end = new Date(endTime);
    if(isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ApiError(400, 'Invalid format for start or end time');
    }
    if(start >= end) {
        throw new ApiError(400, 'End time must be after start time');
    }
    //Prevent creating event in the past
    if(start < new Date()) {
        throw new ApiError(400, 'Start time cannot be in the past')
    }

    // Validate Speakers (Optional but good practice)
    let validSpeakerIds = [];
    if (speakers && Array.isArray(speakers) && speakers.length > 0) {
        // Check if speaker IDs are valid ObjectIds and correspond to actual users
        const speakerDocs = await User.find({
            _id: { $in: speakers },
            role: { $in: ['speaker', 'organizer', 'admin'] } 
        }).select('_id'); // Only fetch IDs for validation

        validSpeakerIds = speakerDocs.map(doc => doc._id);
        // check if all provided speaker IDs were valid?
        if (validSpeakerIds.length !== speakers.length) {
        console.warn("Some provided speaker IDs were invalid or did not match users.");
        }
    }

    // Create Event instance (jitsiRoomName generated by model default)
    const event = new Event({
        title,
        description,
        eventType, // Uses default if not provided and if defined in schema
        startTime: start,
        endTime: end,
        organizer: organizerId,
        speakers: validSpeakerIds, // Use validated speaker IDs
        maxAttendees,
        // status defaults to 'upcoming'
    });

    await event.save();

    // Populate organizer/speaker details for the response
    const createdEvent = await Event.findById(event._id)
    .populate('organizer', 'name email')
    .populate('speakers', 'name email');

    if (!createdEvent) {
        throw new ApiError(500, 'Failed to create an event');
    }

    return res
    .status(200)
    .json(new ApiResponse(200, createdEvent, 'Event created successfully'))
});

/**
 * @desc    Get all events with filtering, sorting, pagination
 * @route   GET /api/v1/events
 * @access  Public
*/
const getAllEvents = asyncHandler(async(req, res) => {
    const { status, eventType, sortBy = 'startTime', order = 'asc', page = 1, limit = 10 } = req.query;

    const filter = {};
    if(status) filter.status = status; //event status- upcoming, live, past
    if(eventType) filter.eventType = eventType;
    
    const sortOptions = {};
    if(sortBy) sortOptions[sortBy] = order === 'desc' ? -1: 1; //descending or ascending order

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    //Query execution
    const events = await Event.find(filter)
    .populate('organizer', 'name email')
    //.populate('speakers', 'name email')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

    //Get total count for pagination
    const totalEvents = await Event.countDocuments(filter);
    const totalPages = Math.ceil(totalEvents/limitNum);

    const pagination = {
        totalEvents,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { events: pagination }, 'Events fetched successfully'))
})
