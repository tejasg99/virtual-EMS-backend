import mongoose, { Schema } from "mongoose";

const qnaSchema = new Schema({
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
    question: {
        type: String,
        required: true,
        trim: true,
    },
    answer: {
        type: String,
        trim: true,
        default: null,
    },
    answeredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    isAnswered: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true,
})

// Index for retrieving Q&A for an event, potentially filtering/sorting
qnaMessageSchema.index({ event: 1, isAnswered: 1, createdAt: -1 }); // Sort newest first

export const QnAMessage = mongoose.model('QnAMessage', qnaSchema);