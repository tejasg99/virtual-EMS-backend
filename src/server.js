import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { app } from './app.js';
import { config } from './config/index.js';

dotenv.config({
    path: './env'
})

//TODO: socket connection and socket handlers

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