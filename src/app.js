import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import { ApiError } from "./utils/apiError.js";
import apiRouter from "./routes/index.js";

const app = express();

//Middlewares
app.use(cors({
    origin: 'http://localhost:5173', //allow all origins for now
    credentials: true, // Allow credentials (cookies, authorization headers)
}));
app.use(express.json({ limit: '16kb'})); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '16kb' })); // Parse URL-encoded bodies
app.use(cookieParser());

//Mount all routes
app.use('/api/v1', apiRouter);

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