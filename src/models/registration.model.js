import mongoose, { Schema } from "mongoose";

const registrationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    registrationDate: {
        type: Date,
        default: Date.now,
    },
    attended: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
})

// Ensure a user can register for a specific event only once
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

// Index for finding all registrations for an event efficiently
registrationSchema.index({ event: 1 });

export const Registration = mongoose.model('Registration', registrationSchema);