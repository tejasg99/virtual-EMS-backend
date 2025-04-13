import { Registration } from "../models/registration.model.js";
import { Event } from "../models/event.model.js";
import { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc    Register current user for an event
 * @route   POST /api/v1/events/:eventId/register
 * @access  Private (Logged-in users)
*/
const registerForEvent = asyncHandler(async(req, res) => {
    const { eventId } = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event Id");
    }

    // Find the event and check its status
    const event = await Event.findById(eventId);
    if (!event) {
        throw new ApiError(404, 'Event not found');
    }

    // Allow registration only for upcoming and live events
    if (!['upcoming', 'live'].includes(event.status)) {
        throw new ApiError(400, `Cannot register for an event that is ${event.status}`);
    }

    //check if already registered
    const existingReg = await Registration.findOne({ user: userId, event: eventId });
    if(existingReg) {
        throw new ApiError(409, 'You are already registered for the event');
    }

    //Registrations should not exceed max attendees
    if(event.maxAttendees) {
        const regCount = await Registration.countDocuments({ event: eventId });
        if(regCount >= event.maxAttendees) {
            throw new ApiError(409, 'Sorry this event is full')
        }
    }

    //Create and save the registration
    const registration = new Registration({
        user: userId,
        event: eventId,
    });

    await registration.save();

    //TODO: email notification trigger here

    return res
    .status(200)
    .json(new ApiResponse(200, registration, 'Registered successfully'));
})

/**
 * @desc    Unregister current user from an event
 * @route   DELETE /api/v1/events/:eventId/unregister
 * @access  Private (Logged-in users)
*/
const unregisterFromEvent = asyncHandler(async(req, res) => {
    const { eventId } = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event Id");
    }

    // Find the registration to delete using deleteOne
    const result = await Registration.deleteOne({ user: userId, event: eventId });

    // 2. Check if a document was actually deleted
    if (result.deletedCount === 0) {
        throw new ApiError(404, 'Registration not found. You may not be registered for this event.');
    }

    return res
    .status(200)
    .json(new ApiResponse(200, null, 'Unregistered Successfully'));
});

/**
 * @desc    Get list of users registered for a specific event
 * @route   GET /api/v1/events/:eventId/registrations
 * @access  Private (Event Organizer or Admin)
*/
const getEventRegistrations = asyncHandler(async(req, res) => {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if(!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event Id");
    }

    // Find the event to verify ownership/admin status
    const event = await Event.findById(eventId).select('organizer'); // Only need organizer field
    if (!event) {
        throw new ApiError(404, 'Event not found');
    }

    //Authorization check
    if(!event.organizer.equals(userId) && userRole !== 'admin') {
        throw new ApiError(403, 'You do not have permission to view registrations for this event');
    }

    // 3. Fetch registrations with pagination and populate user details
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const registrations = await Registration.find({ event: eventId })
    .populate('user', 'name email role')//user fields to return
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 }); //sort by reg date, newest first

    //total count for pagiantion
    const totalRegistrations = await Registration.countDocuments({ event: eventId });
    const totalPages = Math.ceil(totalRegistrations/limitNum);

    const pagination = {
        totalRegistrations,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
    };

    return res
    .status(200)
    .json(new ApiResponse(200, { registrations, pagination }, 'Event registrations fetched successfully'));
});

/**
 * @desc    Get list of events the current user is registered for
 * @route   GET /api/v1/users/me/registrations
 * @access  Private (Logged-in users)
*/
const getUserRegistrations = asyncHandler(async(req, res) => {
    const userId = req.user?._id;
    const { page = 1, limit = 10, status } = req.query;

    //pagination setup
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    //query to find user's registrations
    const registrationQuery = { user: userId };

    //filter based on related event status
    let eventFilter = {};
    if(status) {
        eventFilter.status = status;
    }

    //find events matching the filter
    const relevantEventIds = await Event.find(eventFilter).select('_id');

    //add eventId condition to the registration query
    registrationQuery.event = { $in: relevantEventIds.map(e => e._id)};

    // Fetch registrations, populate event details, apply pagination and sort
    const registrations = await Registration.find(registrationQuery)
    .populate({
        path: 'event',
        select: 'title description startTime endTime status eventType jitsiRoomName organizer', //desired fields
        populate: {
            path: 'organizer',
            select: 'name',
        }
    })
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 }); //sort by reg date

    //Get total count for pagination(matching event filter)
    const totalRegistrations = await Registration.countDocuments(registrationQuery);
    const totalPages = Math.ceil(totalRegistrations/limitNum);
    
    const pagination = {
        totalRegistrations,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
    }

    return res
    .status(200)
    .json(new ApiResponse(200, { registrations, pagination}, 'Event registrations fetched successfully'));
})

/**
 * @desc    Check if the current user is registered for a specific event
 * @route   GET /api/v1/events/:eventId/registration-status
 * @access  Private (Logged-in users)
*/
const checkRegistrationStatus = asyncHandler(async(req, res) => {
    const { eventId } = req.params;
    const userId = req.user?._id;

    if(!isValidObjectId(eventId)) {
        throw new ApiError(400, "Invalid event Id");
    }

    const registration = await Registration.findOne({ user: userId, event: eventId });

    const isRegistered = !!registration; // Convert found document (or null) to boolean

    return res
    .status(200)
    .json(new ApiResponse(200, { isRegistered, registrationId: registration?._id }, 'Registration checked successfully'));
})

export {
    registerForEvent,
    unregisterFromEvent,
    getEventRegistrations,
    getUserRegistrations,
    checkRegistrationStatus,
}