import { isValidObjectId } from "mongoose";
import { QnAMessage } from "../models/qna.model.js";
import { Event } from "../models/event.model.js";

const initializeQnaHandler = (io, socket) => {
    // using a separate room for qna
    const getQnaRoom = (eventId) = `event-${eventId}-qna`;

    // join qna event room
    socket.on('joinEventRoom', async({eventId}, ack) => {
        if(!isValidObjectId(eventId)) {
            if (ack) ack({ success: false, message: 'Invalid event ID format' });
            return;
        }
        try {
            // verify that event exists
            const event = await Event.findById(eventId).select('_id status');
            if(!event) {
                throw new Error('Event not found');
            }

            const room = getQnaRoom(eventId);
            await socket.join(room);
            console.log(`[Socket ${socket.id}] User ${socket.user?.name} joined QnA room: ${room}`);
            if(ack) ack({success: true});

            // send existing qna history to the user just joined
            const qnaHistory = await QnAMessage.find({ event: eventId })
            .sort({ createdAt: -1 })
            .populate('user', 'name _id') // question
            .populate('answeredBy', 'name _id') // answer
            .lean();

            socket.emit('qnaHistory', qnaHistory);
        } catch (error) {
            console.error(`[Socket ${socket.id}] Error joining QnA room ${eventId}:`, error.message);
            if (ack) ack({ success: false, message: error.message || 'Could not join QnA room' });
            socket.emit('socketError', { message: `Error joining QnA room: ${error.message}` });
        }
    });

    // Submit question
    socket.on('submitQuestion', async({ eventId, question }, ack) => {
        // eventId and question data validation
        if(!isValidObjectId(eventId)) {
            if (ack) ack({ success: false, message: 'Invalid event ID format' });
            return;
        }

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            if (ack) ack({ success: false, message: 'Question cannot be empty' });
            return;
        }

        const room = getQnaRoom(eventId);

        // verify that user is in the room 
        if(!socket.rooms.has(room)) {
            if(ack) ack({ success: false, message: 'You must join the event Qna room first'});
            return;
        }

        try {
            // save the question
            const qnaMessage = new QnAMessage({
                user: socket.user._id,
                event: eventId,
                question: question.trim(),
            });
            await qnaMessage.save();

            // Populate details
            const populatedQna = await QnAMessage.findById(qnaMessage._id)
            .populate('user', 'name _id')
            .lean();

            //Broadcast the new question to the room
            io.to(room).emit('newQuestion', populatedQna);
            console.log(`[Socket ${socket.id}] Question submitted by ${socket.user?.name} to room ${room}`);
            if (ack) ack({ success: true, questionId: qnaMessage._id });
        } catch (error) {
            console.error(`[Socket ${socket.id}] Error submitting question to room ${room}:`, error.message);
            if (ack) ack({ success: false, message: error.message || 'Could not submit question' });
            socket.emit('socketError', { message: `Error submitting question: ${error.message}` });
        }
    });

    //Answer question
    socket.on('answerQuestion', async({eventId, questionId, answer }, ack) => {
        if(!isValidObjectId(eventId)) {
            if (ack) ack({ success: false, message: 'Invalid event ID format' });
            return;
        }

        if(!answer || typeof answer !== 'string' || answer.trim().length === 0) {
            if (ack) ack({ success: false, message: 'Answer cannot be empty' });
            return;
        }

        const room = getQnaRoom(eventId);
        if (!socket.rooms.has(room)) {
            if (ack) ack({ success: false, message: 'You must join the event QnA room first.' });
            return;
        }

        try {
            //find event to check permissions
            const event =  await Event.findById(eventId).select('organizer speakers');
            if(!event) {
                throw new Error('Event not found');
            }

            //Check if user is an organizer or speaker for this event
            const isOrganizer = event.organizer.equals(socket.user._id);
            const isSpeaker = event.speakers?.some(speakerId => speakerId.equals(socket.user._id)); //since speakers is an array
            const isAdmin = socket.user.role === 'admin'; //allow admin too for the time being

            if(!isOrganizer && !isSpeaker && !isAdmin) {
                throw new Error('You do not have permission to answer questions for this event.');
            }

            //find and update the question
            const updatedQna = await QnAMessage.findByIdAndUpdate(
                questionId,
                {
                    $set: {
                        answer: answer.trim(),
                        isAnswered: true,
                        answeredBy: socket.user._id,
                    }
                },
                { new: true }, //return the updated document
            )
            .populate('user', 'name _id')
            .populate('answeredBy', 'name _id')
            .lean();

            if(!updatedQna) {
                throw new Error('Question not found or could not be updated.');
            }

            //Broadcast the answered question to all
            io.to(room).emit('questionAnswered', updatedQna)
            console.log(`[Socket ${socket.id}] Question ${questionId} answered by ${socket.user?.name} in room ${room}`)
            if(ack) ack({ success: true });
        } catch (error) {
            console.error(`[Socket ${socket.id}] Error answering question ${questionId} in room ${room}:`, error.message);
            if (ack) ack({ success: false, message: error.message || 'Could not answer question' });
            socket.emit('socketError', { message: `Error answering question: ${error.message}` });
        }
    });

    // Leave Event QnA Room 
    socket.on('leaveEventQnaRoom', ({ eventId }, ack) => {
        if (!isValidObjectId(eventId)) {
            if (ack) ack({ success: false, message: 'Invalid event ID format' });
            return;
        }
        const room = getQnaRoom(eventId);
        socket.leave(room);
        console.log(`[Socket ${socket.id}] User ${socket.user?.name} left QnA room: ${room}`);
        if (ack) ack({ success: true });
    });
};

export default initializeQnaHandler;