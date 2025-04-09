import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { config } from '../config/index.js';

// Middleware to verify JWT and attach user to request
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
      //check if token exists in either cookies or req headers
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  
      if (!token) {
        throw new ApiError(401, "Unauthorized request");
      }

      //verify token
      const decodedToken = jwt.verify(token, config.accessTokenSecret);
  
      //check if user still exists
      const user = await User.findById(decodedToken?._id).select(
        "-refreshToken"
      );
  
      if (!user) {
        throw new ApiError(401, "Invalid Access Token");
      }
  
      // Add object to req
      req.user = user;
      next();
    } catch (error) {
      throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});

// Middleware factory to restrict routes to specific roles
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles is an array like ['admin', 'organizer']
        // req.user is available from the protect middleware
        if (!req.user || !roles.includes(req.user.role)) {
            return next(
                new ApiError(403,'You do not have permission to perform this action')
            );
        }
        next();
    };
};