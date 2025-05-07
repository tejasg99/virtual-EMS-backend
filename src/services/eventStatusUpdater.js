import { Event } from "../models/event.model.js";
import { Registration } from "../models/registration.model.js";
import { User } from "../models/user.model.js";
import sendEmail from "./email.service.js";

// Configuration
// Time before event starts to send reminder (in minutes)
const REMINDER_WINDOW_MINUTES =
  parseInt(process.env.EVENT_REMINDER_WINDOW_MINUTES, 10) || 15; // Use  variable or default to 15 minutes

const updateEventStatusesAndSendReminders = async () => {
  const now = new Date();
  console.log(
    `[${now.toLocaleTimeString()}] Running event status update & reminder job...`
  );

  try {
    console.log('[Event Status] Checking for status updates...');
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

    // Send Event Reminders
    console.log(
      `[Event Reminder] Checking for events starting within ${REMINDER_WINDOW_MINUTES} minutes...`
    );
    // Calculate the cutoff time for reminders
    const reminderCutoffTime = new Date(
      now.getTime() + REMINDER_WINDOW_MINUTES * 60000
    );

    // Find upcoming events within the reminder window for which reminders haven't been sent
    const eventsToSendReminders = await Event.find({
      status: "upcoming", // Only for upcoming events
      reminderSent: false, // Only if reminder hasn't been sent yet
      startTime: {
        $gt: now, // Start time is still in the future (prevents duplicate reminders if job runs close to start time)
        $lte: reminderCutoffTime, // Start time is within the next N minutes
      },
    }).select("_id title startTime"); // Select only needed fields for efficiency

    // Check if any events need reminders
    if (eventsToSendReminders.length > 0) {
      console.log(
        `[Event Reminder] Found ${eventsToSendReminders.length} events needing reminders.`
      );

      // Process each event found
      for (const event of eventsToSendReminders) {
        console.log(
          `[Event Reminder] Processing event: ${event.title} (${event._id})`
        );
        let emailsSentCount = 0;
        try {
          // Find registrations for this specific event
          const registrations = await Registration.find({ event: event._id })
            .select("user -_id") // Select only the user ID
            .lean(); // Use lean for performance

          if (registrations.length === 0) {
            console.log(
              `[Event Reminder] No registrations found for event ${event.title}. Marking as sent.`
            );
            // Mark reminder as sent even if no one registered to prevent re-checking
            await Event.updateOne(
              { _id: event._id },
              { $set: { reminderSent: true } }
            );
            continue; // Move to the next event
          }

          // Extract user IDs from registrations
          const userIds = registrations.map((reg) => reg.user);

          // Find user details(email and name) for the registered users
          const usersToRemind = await User.find({ _id: { $in: userIds } })
            .select("email name") // Select only necessary fields
            .lean();

          if (usersToRemind.length > 0) {
            const eventStartTimeFormatted = new Date(
              event.startTime
            ).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            }); // Format time nicely
            // Construct the live event URL (ensure FRONTEND_URL is set in env)
            const liveEventUrl = `${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }/events/${event._id}/live`;

            console.log(
              `[Event Reminder] Attempting to send ${usersToRemind.length} reminders for event: ${event.title}`
            );

            // Send email to each registerd user
            for (const user of usersToRemind) {
              if (!user.email) {
                console.warn(
                  `[Event Reminder] User ${
                    user.name || user._id
                  } has no email address. Skipping reminder.`
                );
                continue;
              }
              const emailSubject = `Reminder: Event "${event.title}" is starting soon!`;
              const emailText = `Hi ${
                user.name || "User"
              },\n\nThis is a reminder that the event "${
                event.title
              }" you registered for is starting soon at ${eventStartTimeFormatted}.\n\nJoin here: ${liveEventUrl}\n\nWe look forward to seeing you!\n\nThe EventMan Team`;
              const emailHtml = `<p>Hi ${
                user.name || "User"
              },</p><p>This is a reminder that the event "<strong>${
                event.title
              }</strong>" you registered for is starting soon at <strong>${eventStartTimeFormatted}</strong>.</p><p>Join the event here: <a href="${liveEventUrl}">${liveEventUrl}</a></p><p>We look forward to seeing you!</p><p>The EventMan Team</p>`;

              try {
                await sendEmail({
                  to: user.email,
                  subject: emailSubject,
                  text: emailText,
                  html: emailHtml,
                });
                emailsSentCount++;
              } catch (emailError) {
                console.error(
                  `[Event Reminder] Failed to send reminder to ${user.email} for event ${event._id}:`,
                  emailError.message
                );
                // Continue sending to others even if one fails
              }
            }
            console.log(
              `[Event Reminder] Successfully attempted sending ${emailsSentCount}/${usersToRemind.length} reminders for event ${event._id}.`
            );
          } else {
            console.log(
              `[Event Reminder] Could not find user details for registrations of event ${event._id}.`
            );
          }

          // Mark reminder as sent for this event after attempting all emails
          await Event.updateOne(
            { _id: event._id },
            { $set: { reminderSent: true } }
          );
          console.log(
            `[Event Reminder] Marked reminderSent=true for event ${event._id}`
          );
        } catch (error) {
          console.error(
            `[Event Reminder] Error processing reminders loop for event ${event._id}:`,
            error
          );
          // Avoid marking as sent if there was a processing error before sending emails
        }
      }
    } else {
      console.log(
        `[Event Reminder] No events found requiring reminders in this run.`
      );
    }

    console.log(`[Event Status/Reminder] Job finished.`);
  } catch (error) {
    console.error("[Event Status/Reminder] Error running job:", error);
  }
};

export default updateEventStatusesAndSendReminders;
