import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { config } from "../config/index.js";


//load env variables
dotenv.config({
    path: "../../.env"
})

const connDB = async() => {
    // connect directly
    try {
        if (!config.mongodbUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }
        await mongoose.connect(config.mongodbUri);
        console.log('MongoDB Connected for seeding...');
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

const seedAdminUser = async() => {
    await connDB();
    try {
        const adminEmail = config.adminEmail;
        const adminPassword = config.adminPass;
        const adminName = config.adminName;

        if (!adminEmail || !adminPassword || !adminName) {
            throw new Error('SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_NAME must be defined in .env');
        }

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log(`Admin user with email ${adminEmail} already exists.`);
            return; // Exit if admin already exists
        }

        // Create the admin user instance
        const adminUser = new User({
            name: adminName,
            email: adminEmail,
            password: adminPassword, // Provide plain password, pre-save hook will hash it
            role: 'admin',
        });

        // Save the admin user
        await adminUser.save();
        console.log(`Admin user ${adminName} (${adminEmail}) created successfully!`);
    } catch (error) {
        console.error('Error seeding admin user:', error.message);
        process.exit(1);
    } finally {
        // Disconnect from the database
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

//call the function
seedAdminUser();

