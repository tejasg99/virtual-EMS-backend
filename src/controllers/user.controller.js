import { User } from '../models/user.model.js';
import {ApiError} from '../utils/apiError.js';
import {ApiResponse} from '../utils/apiResponse.js';
import {asyncHandler} from '../utils/asyncHandler.js';

/**
 * @desc    Get current logged-in user's profile
 * @route   GET /api/v1/users/me
 * @access  Private (Requires valid access token via 'protect' middleware)
*/
const getCurrentUser = asyncHandler(async(req, res) => {
    // The 'verifyJWT' middleware already found the user and attached it to req.user so just need to return it
    return res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "Current user fetched successfully"))
})

/**
 * @desc    Update current logged-in user's profile
 * @route   PATCH /api/v1/users/me/update
 * @access  Private (Requires valid access token via 'protect' middleware)
*/
const updateUserProfile = asyncHandler(async(req, res) => {
    const {name, email} = req.body;
    const userId = req.user._id;

    // Update object prepared with allowed fields
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();

    // Basic check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, 'No valid fields provided for update');
    }

    // If email is being updated, check if it's already taken by another user
    if (updateData.email) {
        const existingUserWithEmail = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
        if (existingUserWithEmail) {
            throw new ApiError(409, 'Email address is already in use by another account');
        }
        // TODO: In a production app, changing email should ideally trigger a verification process.
    }

    // Find user by ID and update allowed fields
    // { new: true } to return the updated document
    // { runValidators: true } to ensure schema validations run (e.g., email format)
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData }, // $set to update only specified fields
        { new: true, runValidators: true }
    ).select('-password -refreshToken'); // Exclude sensitive fields from the result

    if (!updatedUser) {
        // Should not happen if 'protect' works, but handle just in case
        throw new ApiError(404, 'User not found for update');
    }

    // 4. Send Response
    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'User profile updated successfully'));
})

// --- Admin Only Functions(to be improved) ---
/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/v1/users
 * @access  Private/Admin
*/
const getAllUsers = asyncHandler(async(req, res) => {
    //TODO: Pagination, filtering, sorting
    const users = await User.find().select('-password -refreshToken');
    return res
    .status(200)
    .json(new ApiResponse(200, users, 'All users fetched successfully'))
})

/**
 * @desc    Get user by ID (Admin only)
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin
*/
const getUserById = asyncHandler(async(req, res) => {
    const {userId} = req.params;

    const user = await User.findById(userId).select('-password -refreshToken');
    if(!user) {
        throw new ApiError(404, 'User not found');
    }
    return res
    .status(200)
    .json(new ApiResponse(200, user, 'User fetched successfully'));
});

/**
 * @desc    Update user role (Admin only)
 * @route   PATCH /api/v1/users/:id/role
 * @access  Private/Admin
*/
const updateUserRole = asyncHandler(async(req, res) => {
    const {role} = req.body;
    const {userId} = req.params;

    //validate role
    const allowedRoles = ['attendee', 'organizer', 'speaker', 'admin'];
    if (!role || !allowedRoles.includes(role)) {
        throw new ApiError(500, `Invalid role specified. Must be one of: ${allowedRoles.join(', ')}`);
    }

    // TODO: Prevent admin from accidentally changing their own role here Or ensure there's always one admin
    
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { role: role },
        { new: true, runValidators: true }
    ).select('-password -refreshToken');
    if(!updatedUser) {
        throw new ApiError(500, 'Failed to update user role')
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'User role updated successfully'));
});

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
*/
const deleteUser = asyncHandler(async(req, res) => {
    const userId = req.params;

    // Possible implications: what happens to events organized by this user? Registrations? etc.
    // For now, implementing hard delete:
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
       throw new ApiError(404, 'User not found');
   }

   // TODO: Perform cleanup actions here (e.g., reassign events, delete related data)
    return res
    .status(200)
    .json(new ApiResponse(200, null, 'User deleted successfully'));
});

export{
    getCurrentUser,
    updateUserProfile,
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
}