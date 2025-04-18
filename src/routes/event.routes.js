import { Router } from "express";
import { verifyJWT, restrictTo } from "../middlewares/auth.middleware";
import {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
} from "../controllers/event.controller.js";
import {
    registerForEvent,
    unregisterFromEvent,
    getEventRegistrations,
    checkRegistrationStatus,
} from "../controllers/registration.controller.js";

const router = Router();

//Event crud operations
router.post('/', restrictTo('organizer', 'admin'), createEvent); //create required organizer or admin role

//Public read operations
router.get('/', getAllEvents);
router.get('/:id', getEventById);

//require auth+ownership/admin check
router.patch('/:id', verifyJWT, updateEvent);
router.delete('/:id', verifyJWT, deleteEvent);

//Event registration related routes
router.post('/:eventId/register', verifyJWT, registerForEvent);
router.delete('/:eventId/umregister', verifyJWT, unregisterFromEvent);
router.get('/:eventId/registration-status', verifyJWT, checkRegistrationStatus);

router.get('/:eventId/registrations', verifyJWT, getEventRegistrations); //requires organizer/admin check(done in controller)

export default router;