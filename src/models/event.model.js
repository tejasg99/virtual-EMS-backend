import mongoose, { Schema } from "mongoose";
import { generateUniqueRoomName } from '../utils/generateRoomName.js'

const eventSchema  = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true 
    },
    eventType: {
        type: String,
        enum: ['webinar', 'hackathon', 'meetup', 'other'],
        default: 'webinar'
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required']
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required'],
        validate: [
            function(value) {
                return this.startTime < value;
            },
            'End time must be after start time'
        ]
    },
    organizer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    speakers: {
        type: Schema.Types.ObjectId, //array of speakers
        ref: 'User'
    },
    JitsiRoomName: {
        type: String,
        required: true,
        unique: true,
        default: () => generateUniqueRoomName(),
    },
    status: {
        type: String,
        enum: ['upcoming', 'live', 'past', 'cancelled'],
        default: 'upcoming',
        index: true,
    },
    maxAttendees: {
        type: Number,
        min: [1, 'Max attendees must be at least 1']
    },
}, {
    timestamps: true,
})

// Indexing common query fields
eventSchema.index({ startTime: 1 });
eventSchema.index({ organizer: 1 });

export const Event = mongoose.model('Event', eventSchema);