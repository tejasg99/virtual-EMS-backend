import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema({
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
    message: {
        type: String,
        required: true,
        trim: true,
    }
}, {
    timestamps: true,
})

// Index for retrieving chat messages for a specific event, sorted by time
chatMessageSchema.index({ event: 1, createdAt: 1 });

export const ChatMessage = mongoose.model('ChatMessage', chatSchema);