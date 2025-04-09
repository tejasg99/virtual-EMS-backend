import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import { ApiError } from "./utils/apiError.js";

const app = express();

//Middlewares
app.use(cors({
    origin: '*', //allow all origins for now
    credentials: true, // Allow credentials (cookies, authorization headers)
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser());
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

//routes


//healthCheck route 
app.get('/', (req, res) => {
    res
    .status(200)
    .send('Server is healthy')
})

// --- Handle 404 Errors ---
// Send back a 404 error for any unknown api request
app.use((req, res, next) => {
    next(new ApiError(404, 'API endpoint not found'));
});

//global errorHandler as a last middleware
app.use(errorHandler);

export { app };