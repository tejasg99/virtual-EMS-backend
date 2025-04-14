import { isValidObjectId } from "mongoose";
import { ChatMessage } from "../models/chat.model.js";
import { Event } from "../models/event.model.js";

const initializeChatHandler = (io, socket) => {

    // join event chat room 
    socket.on('joinEventRoom', async({eventId}, ack) => {
        if(!isValidObjectId(eventId)) {
            console.error(`[Socket ${socket.id} Invalid event id format: ${eventId}]`);
            if(ack) ack({ success: false, message: 'Invalid event id format'});
            return; // stop processing
        }

        try {
            // verify event exits and is active or upcoming
            const event = await Event.findById(eventId).select('_id status');
            if(!event || !['upcoming', 'live'].includes(event.status)) {
                throw new Error(`Event not found or is not accessible (Status: ${event?.status})`);
            }

            const room = `event-${eventId}-chat`;
            await socket.join(room); // join room using socket io join method
            console.log(`[Socket ${socket.id}] User ${socket.user?.name} joined chat room: ${room}`);

            // Acknowledge successful joining
            if(ack) ack({ success: true, message: `Joined chat for event ${eventId}`});

            // Send recent chat history for the user just joined
            const recentMessages = await ChatMessage.find({event: eventId})
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user', 'name _id')// Populate sender info
            .lean(); // lean for plain js objects

            socket.emit('chatHistory', recentMessages.reverse()); // Send history (reversed to be chronological)
            
            // Broadcast to room that a user joined (excluding sender)
            socket.to(room).emit('userJoinedChat', { userId: socket.user._id, name: socket.user.name });
        } catch (error) {
            console.error(`[Socket ${socket.id}] Error joining event room ${eventId}:`, error.message);
            if (ack) ack({ success: false, message: error.message || 'Could not join event chat room' });
            socket.emit('socketError', { message: `Error joining chat room: ${error.message}` });
        }
    })

    // Send chat message
    socket.on('sendChatMessage', async({eventId, message}, ack) => {
        if(!isValidObjectId(eventId)) {
            if (ack) ack({ success: false, message: 'Invalid event ID format' });
            return;
        }

        if(!message || typeof message !== 'string' || message.trim().length === 0) {
            if(ack) ack({ success: false, message: 'Message cannot be empty'});
            return;
        }

        const room = `event-${eventId}-chat`;
        // verify the user is actually in the room to send a message
        if(!socket.rooms.has(room)) {
            console.warn(`[Socket ${socket.id}] User ${socket.user?.name} attempted to send message to room ${room} without joining.`);
            if (ack) ack({ success: false, message: 'You must join the event room first.' });
            return;
        }

        try {
            // Create and save the message to db
            const chatMsg = new ChatMessage({
                user: socket.user._id,
                event: eventId,
                message: message.trim(), // trim whitespaces
            });
            await chatMsg.save();

            // Prepare msg data for broadcasting
            const populatedMessage = {
                _id: chatMsg._id,
                user: { _id: socket.user._id, name: socket.user.name }, // basic user info
                event: chatMsg.event,
                message: chatMsg.message,
                createdAt: chatMsg.createdAt,
            };

            // Broadcast the msg to everyone in the room(including the sender)
            io.to(room).emit('newChatMessage', populatedMessage);
            console.log(`[Socket ${socket.id}] Message sent by ${socket.user?.name} to room ${room}`);
            if(ack) ack({ success: true }); // acknowledge successful send
        } catch (error) {
            console.error(`[Socket ${socket.id}] Error sending message to room ${room}:`, error.message);
            if (ack) ack({ success: false, message: error.message || 'Could not send message' });
            socket.emit('socketError', { message: `Error sending message: ${error.message}` });
        }
    });

    // Leave Event chat room
    socket.on('leaveEventRoom', ({eventId}, ack) => {
        if(!isValidObjectId(eventId)) {
            if (ack) ack({ success: false, message: 'Invalid event ID format' });
            return;
        }

        const room = `event-${eventId}-chat`;
        socket.leave(room);
        console.log(`[Socket ${socket.id}] User ${socket.user?.name} left chat room: ${room}`);
        if (ack) ack({ success: true });
        // Broadcast user left
        // socket.to(room).emit('userLeftChat', { userId: socket.user._id, name: socket.user.name });
    });
    // Disconnect event in server.js handles implicit leaving
};

export default initializeChatHandler;