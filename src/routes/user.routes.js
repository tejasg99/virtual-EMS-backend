import { Router } from "express";
import { verifyJWT, restrictTo } from "../middlewares/auth.middleware";
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
router.get('/:id', restrictTo('admin'), getUserById);
router.patch('/id/role', restrictTo('admin'), updateUserRole);
router.delete('/:id', restrictTo('admin'), deleteUser);

export default router;