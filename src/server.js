import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { app } from "./app.js";
import { config } from "./config/index.js";
import http from "http";
import { Server as SocketIOServer } from 'socket.io';
import jwt from "jsonwebtoken";
import { User} from "./models/user.model.js";
import initializeChatHandler from "./socketHandlers/chat.handler.js";
import initializeQnaHandler from "./socketHandlers/qna.handler.js";

dotenv.config({
    path: '../.env'
})

const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true, //needed for cookies from frontend
    }
});

// Socket io authentication middleware
io.use(async(socket, next) => {
    // Client should send token in handshake query or auth object
    // Example using auth object: io({ auth: { token: '...' } })
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
        return next(new Error('Authentication error: Token not provided'));
    }

    try {
        const decoded = jwt.verify(token, config.accessTokenSecret); 

        // Find user and attach essential info to socket object for later use
        const user = await User.findById(decoded?._id).select('name email role'); // Select non-sensitive fields
        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        // Attach user info to the socket instance for use in event handlers
        socket.user = user; // Alternative - socket.data.user
        next();
    } catch (error) {
        console.error("Socket Auth Error:", error.message);
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Authentication error: Token expired'));
        }
        if (error.name === 'JsonWebTokenError') {
             return next(new Error('Authentication error: Invalid token'));
        }
        return next(new Error('Authentication error'));
    }
});

//Socket io connection handling
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}, User: ${socket.user?.name} (${socket.user?._id})`)

    // Initialize handlers for this authenticated socket connection
    initializeChatHandler(io, socket);
    initializeQnaHandler(io, socket);

    // General error handling for the socket
    socket.on('error', (error) => {
        console.error(`Socket error on ${socket.id}: `, error);
        // Emit an error back to the client
        socket.emit('socketError', { message: error.message || 'An internal socket error occurred.' });
    });

    socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
        // Auto-cleanup of rooms happens, but custom logic can be added here
    })
})

connectDB()
.then(() => {
    app.listen(config.port || 5000, () => {
        console.log(`Server running on port: ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed !!!", err);
    process.exit(1);
})

// --- Handle Unhandled Rejections and Uncaught Exceptions ---
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => { // Close server gracefully
      process.exit(1);
    });
});
  
process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    process.exit(1); // Immediate shutdown as state is unknown
});