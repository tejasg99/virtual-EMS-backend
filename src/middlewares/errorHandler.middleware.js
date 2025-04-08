import { ApiError } from "../utils/apiError.js";

// Error-handling middleware
const errorHandler = (err, req, res, next) => {
    // Log the full error stack to the backend console
    console.error(err.stack || err);

    // If the error is an instance of ApiError
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: err.success,
            message: err.message,
            errors: err.errors,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Only return stack trace in development
        });
    }

    // Fallback for other errors (not using ApiError)
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        errors: [],
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

export default errorHandler;
