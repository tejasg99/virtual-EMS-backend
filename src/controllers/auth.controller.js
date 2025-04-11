import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import { config } from '../config/index.js';


// AT and RT separate method
const generateAccessAndRefreshTokens = async(userId) => {
    try {
       const user =  await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken =  user.generateRefreshToken()

      // adding refreshToken to database    
       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave: false })

       return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
*/
const registerUser = asyncHandler( async(req, res) => {
    const { name, email, password } = req.body;

    // Input Validation 
    if (!name || !email || !password) {
        throw new ApiError(400, 'Name, email, and password are required');
    }
    if (password.length < 6) {
            throw new ApiError(400, 'Password must be at least 6 characters long');
    }
        // Email format check (Mongoose validation also does this)
    if (!/\S+@\S+\.\S+/.test(email)) {
            throw new ApiError(400, 'Please provide a valid email address');
    }

    //check if the user already exists
    const existingUser = await User.findOne({email});
    if(existingUser) {
        throw new ApiError(409, 'User with given email already exists')
    }

    //create a new user
    const user = new User({
        name,
        email,
        password,
        //role defaulted to attendee as per the schema
    })

    //save to database
    await user.save();

    //retrieve for the response
    const createdUser = await User.findById(user._id).select('-password -refreshToken');

    if(!createdUser) {
        throw new ApiError(500, 'Failed to register the user')
    }

    return res
    .status(200)
    .json(new ApiResponse(200, createdUser, 'User registered successfully'));
})

/**
 * @desc    Authenticate user and get tokens
 * @route   POST /api/v1/auth/login
 * @access  Public
*/
const loginUser = asyncHandler(async(req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    //find user
    const user = await User.findOne({ email }).select('+password');

    if(!user){
        throw new ApiError(404, "User not found")
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Incorrect Password")
    }

    // AT and RT
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    // Check if one more db query is expensive if yes then just update the user from previous query
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // cookies
    res.setHeader('Set-Cookie', [
        `accessToken=${accessToken}; Max-Age=${
            1 * 24 * 60 * 60
        }; Path=/; HttpOnly; Secure; SameSite=None`,
        `refreshToken=${refreshToken}; Max-Age=${
            15 * 24 * 60 * 60
        }; Path=/; HttpOnly; Secure; SameSite=None`,
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            }, 
            "User logged in successfully"
        )
    );
})

/**
 * @desc    Log out user
 * @route   POST /api/v1/auth/logout
 * @access  Private (Requires valid access token via 'protect' middleware)
*/
const logoutUser = asyncHandler(async(req, res) => {
    // auth middleware already attached req.user
    // find user and reset refeshToken
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )
    
    // clear cookies
    res.setHeader('Set-Cookie', [
        'accessToken=; Max-Age=-1; Path=/; HttpOnly; Secure; SameSite=None',
        'refreshToken=; Max-Age=-1; Path=/; HttpOnly; Secure; SameSite=None',
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"))

})

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (but requires a valid refresh token, typically from cookie)
*/
const refreshAccessToken = asyncHandler(async(req, res) => {
    // Get refresh Token
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            config.refreshTokenSecret
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        
        res.setHeader('Set-Cookie', [
            `accessToken=${accessToken}; Max-Age=${
              1 * 24 * 60 * 60
            }; Path=/; HttpOnly; Secure; SameSite=None`,
            `refreshToken=${newRefreshToken}; Max-Age=${
              15 * 24 * 60 * 60
            }; Path=/; HttpOnly; Secure; SameSite=None`,
        ]);

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}