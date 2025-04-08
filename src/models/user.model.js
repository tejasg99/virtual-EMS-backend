import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false, // Do not send password hash by default
    },
    role: {
        type: String,
        enum: ['attendee', 'organizer', 'speaker', 'admin'],
        default: 'attendee',
    }
}, { 
    timestamps: true, //adds createdAt and updatedAt automatically
})

//Password hashing pre-save hook
userSchema.pre('save', async function(next) {
    //only hash password if it is modified or is new
    if(!this.isModified('password')) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10); //password and number of hash salt
        next();
    } catch (error) {
        next(error);
    }
})

//method to compare/validate password hash
userSchema.methods.isPasswordCorrect = async function(candidatePassword){
    return await bcrypt.compare(candidatePassword, this.password)
}

//TODO: jwt accessToken and refreshToken decision

export const User = mongoose.model('User', userSchema);

