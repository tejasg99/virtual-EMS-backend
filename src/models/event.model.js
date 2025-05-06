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
        required: [true, 'End time is required']
    },
    organizer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    speakers: {
        type: [{ // Defines it as an array
            type: mongoose.Schema.Types.ObjectId, // Each element is an ObjectId
            ref: 'User' // Referencing the User model
        }],
        default: [],
    },
    jitsiRoomName: {
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
    reminderSent: {
        type: Boolean,
        default: false,
        index: true // Index this field for efficient querying
    }
}, {
    timestamps: true,
})

// PRE-SAVE HOOK 
// Ensure jitsiRoomName is set before saving, even if default somehow fails
eventSchema.pre('save', function(next) {
    if (this.isNew && !this.jitsiRoomName) {
      // If it's a new document and jitsiRoomName is still missing (despite default/required)
      console.warn(`jitsiRoomName was missing before save for event ${this.title}. Generating default.`);
      this.jitsiRoomName = generateUniqueRoomName();
    }
    next(); // Continue with the save operation
});

// Indexing common query fields
eventSchema.index({ startTime: 1 });
eventSchema.index({ organizer: 1 });

export const Event = mongoose.model('Event', eventSchema);