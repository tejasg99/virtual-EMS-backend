import { Router } from "express";
import { verifyJWT, restrictTo } from "../middlewares/auth.middleware.js";
import {
    getCurrentUser,
    updateUserProfile,
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
} from "../controllers/user.controller.js";
import { getUserRegistrations } from "../controllers/registration.controller.js";

const router = Router();

//Protected routes for logged in users
router.use(verifyJWT);

router.get('/me', getCurrentUser);
router.patch('/me/update', updateUserProfile);
router.get('/me/registrations', getUserRegistrations); //user registered events


//Admin only routes
router.get('/', restrictTo('admin'), getAllUsers);
router.get('/:userId', restrictTo('admin'), getUserById);
router.patch('/:userId/role', restrictTo('admin'), updateUserRole);
router.delete('/:userId', restrictTo('admin'), deleteUser);

export default router;