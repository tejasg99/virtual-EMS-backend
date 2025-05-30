import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    getMyOrganizedEvents,
    getOrganizerStats,
} from "../controllers/event.controller.js";
import {
    registerForEvent,
    unregisterFromEvent,
    getEventRegistrations,
    checkRegistrationStatus,
} from "../controllers/registration.controller.js";

const router = Router();

// Specific routes 
router.get('/my-organized', verifyJWT, getMyOrganizedEvents); // fetch events organized by the current user
router.get('/my-organized/stats', verifyJWT, getOrganizerStats); // Fetch organizer stats

//Event crud operations
router.post('/', verifyJWT, createEvent); //create required organizer or admin role

//Public read operations
router.get('/', getAllEvents);
router.get('/:eventId', getEventById);

//require auth+ownership/admin check
router.patch('/:eventId', verifyJWT, updateEvent);
router.delete('/:eventId', verifyJWT, deleteEvent);

//Event registration related routes
router.post('/:eventId/register', verifyJWT, registerForEvent);
router.delete('/:eventId/unregister', verifyJWT, unregisterFromEvent);
router.get('/:eventId/registration-status', verifyJWT, checkRegistrationStatus);

router.get('/:eventId/registrations', verifyJWT, getEventRegistrations); //requires organizer/admin check(done in controller)

export default router;