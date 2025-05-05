import { Event } from "../models/event.model.js";

const updateEventStatuses = async () => {
  const now = new Date();
  console.log(`[${now.toISOString()}] Running event status update job...`);

  try {
    // Update 'upcoming to live'
    // Find events that are 'upcoming', start time is past, end time is future
    const upcomingToLiveUpdate = await Event.updateMany(
      {
        status: "upcoming",
        startTime: { $lte: now }, // Start time is less than or equal to now
        endTime: { $gt: now }, // End time is greater than now
      },
      { $set: { status: "live" } }
    );

    if (upcomingToLiveUpdate.modifiedCount > 0) {
      console.log(
        `[Event Status] Updated ${upcomingToLiveUpdate.modifiedCount} events from 'upcoming' to 'live'.`
      );
    }

    // --- Update 'live' to 'past' ---
    // Find events that are 'live' and end time is past
    const liveToPastUpdate = await Event.updateMany(
      {
        status: "live",
        endTime: { $lte: now }, // End time is less than or equal to now
      },
      { $set: { status: "past" } }
    );

    if (liveToPastUpdate.modifiedCount > 0) {
      console.log(
        `[Event Status] Updated ${liveToPastUpdate.modifiedCount} events from 'live' to 'past'.`
      );
    }

    // Update 'upcoming' directly to 'past' if start/end times were very short and missed the 'live' window
    const upcomingToPastUpdate = await Event.updateMany(
      {
        status: "upcoming",
        endTime: { $lte: now }, // End time is already past, but it's still marked upcoming
      },
      { $set: { status: "past" } }
    );

    if (upcomingToPastUpdate.modifiedCount > 0) {
      console.log(
        `[Event Status] Updated ${upcomingToPastUpdate.modifiedCount} events directly from 'upcoming' to 'past'.`
      );
    }

    console.log(`[Event Status] Update job finished.`);
  } catch (error) {
    console.error("[Event Status] Error updating event statuses:", error);
  }
};

export default updateEventStatuses;
