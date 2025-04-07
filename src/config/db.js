import mongoose from "mongoose";
import { config } from "./index.js";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri);
        console.log(`\n MongoDB connected !! DB HOST: ${conn.connection.host}`)
    } catch (error) {
        console.log("MONGODB connection failed ", error);
        process.exit(1); //exit process with failure asap
    }
}

export default connectDB;