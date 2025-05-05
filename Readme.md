# Virtual Event Management System backend
## Overview
This is the backend service for the Virtual Event Management System, a platform designed for hosting and managing virtual events like webinars, hackathons, and online meetups. It provides a RESTful API for frontend interactions, handles real-time communication via WebSockets, manages user authentication, processes event data, and includes scheduled tasks for status updates and reminders.
Built with Node.js, Express, and MongoDB, this backend supports features like event creation, user registration, live chat, Q&A, and role-based access control.

## Core Features
* **User Authentication & Management:**
    * Secure user registration (password hashing with bcrypt).
    * JWT-based authentication (Access Tokens and Refresh Tokens via secure HttpOnly cookies).
    * Login, Logout, and automatic Token Refresh mechanisms.
    * User profile retrieval and updates.
* **Role-Based Access Control (RBAC):**
    * Defines roles: `attendee`, `organizer`, `speaker`, `admin`.
    * Middleware (`protect`, `restrictTo`) to secure API endpoints based on authentication status and user role.
    * Admin role has full access, including user management capabilities.
    * Automatic role promotion: Users creating their first event are promoted from 'attendee' to 'organizer'.
* **Event Management (CRUD):**
    * Create, Read, Update, Delete (soft delete via status change) operations for events.
    * Event details include title, description, type, start/end times, organizer, speakers, max attendees, and status.
    * Automatic generation of unique Jitsi room names for video conferencing integration.
* **Event Registration:**
    * Users can register/unregister for upcoming or live events.
    * Checks for maximum attendee limits.
    * Organizers/Admins can view the list of registered users for their events.
    * Users can view the list of events they are registered for.
* **Real-time Communication (Socket.IO):**
    * Secure WebSocket connections authenticated via JWT.
    * Event-specific chat rooms for live text communication.
    * Persistence of chat messages.
    * Event-specific Q&A rooms.
    * Functionality for submitting questions, answering questions (by organizer/speaker/admin), and upvoting questions.
    * Persistence of Q&A messages.
* **Scheduled Tasks (node-cron):**
    * Automatic updates of event status (`upcoming` -> `live` -> `past`) based on start/end times.
    * Automated email reminders sent to registered users shortly before an event starts (configurable time window).
* **Email Notifications (Nodemailer):**
    * Service for sending emails (e.g., welcome email on registration, event reminders).
    * Configurable via environment variables for different email providers (e.g., SendGrid, Mailgun).
* **Admin Functionality:**
    * Seed script (`seed:admin`) to create the initial administrator account.
    * API endpoints for listing users, changing user roles, and deleting users (accessible only to admins).
* **Error Handling:**
    * Centralized global error handling middleware.
    * Custom `ApiError` class for consistent API error responses with status codes.
    * `asyncHandler` utility to wrap async controllers and catch errors.

## Technology Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (using Mongoose ODM)
* **Authentication:** JSON Web Tokens (JWT), bcryptjs (hashing)
* **Real-time:** Socket.IO
* **Scheduling:** node-cron
* **Email:** Nodemailer
* **Environment Variables:** dotenv
* **Other:** cors, cookie-parser, http-status, morgan (dev logging)

## Project Structure (Layer-Based)
```
virtual-event-backend/
├── config/         # Database connection, environment config
├── controllers/    # Request handling logic (Auth, User, Event, Registration)
├── middlewares/    # Custom middleware (Auth, Error Handling)
├── models/         # Mongoose schemas and models
├── routes/         # API route definitions
├── scripts/        # Utility/Setup scripts (e.g., seedAdmin.js)
├── services/       # Business logic, external services (Email, Event Status Updater)
├── socketHandlers/ # Logic for Socket.IO events (Chat, Q&A)
├── utils/          # Utility functions/classes (ApiError, ApiResponse, asyncHandler)
├── .env            # Environment variables
├── .env.sample     # Sample Environment variables file
├── .gitignore
├── app.js          # Express app setup (middleware, mounting routes)
├── package.json
└── server.js       # Entry point (Starts server, connects DB, initializes Socket.IO, schedules cron)
```

## API Endpoints
```
*(Base Path: `/api/v1`)*

**Authentication (`/auth`)**
* `POST /register`: Register a new user.
* `POST /login`: Log in a user, receive tokens (access token in body, refresh token in cookie).
* `POST /logout`: Log out user (requires valid access token), clears refresh token.
* `POST /refresh-token`: Get a new access token using the refresh token cookie.

**Users (`/users`)**
* `GET /me`: Get current logged-in user's profile (Protected).
* `PATCH /me/update`: Update current user's profile (name, email) (Protected).
* `GET /me/registrations`: Get events the current user is registered for (Protected).
* `GET /`: Get all users (Admin only).
* `GET /:userId`: Get user by ID (Admin only).
* `PATCH /:userId/role`: Update user role (Admin only).
* `DELETE /:userId`: Delete user (Admin only).

**Events (`/events`)**
* `POST /`: Create a new event (Protected - Login required).
* `GET /`: Get a list of all events (Public, supports pagination/sorting/filtering).
* `GET /my-organized`: Get events organized by the current user (Protected, supports pagination/sorting).
* `GET /my-organized/stats`: Get statistics for events organized by the current user (Protected).
* `GET /:eventId`: Get details for a specific event (Public).
* `PATCH /:eventId`: Update a specific event (Protected - Organizer/Admin only).
* `DELETE /:eventId`: Cancel (soft delete) a specific event (Protected - Organizer/Admin only).

**Registrations (Nested under Events)**
* `POST /:eventId/register`: Register current user for an event (Protected).
* `DELETE /:eventId/unregister`: Unregister current user from an event (Protected).
* `GET /:eventId/registration-status`: Check if current user is registered for an event (Protected).
* `GET /:eventId/registrations`: Get list of users registered for an event (Protected - Organizer/Admin only).
```
## Setup & Installation
1. Clone the repository:
```
git clone https://github.com/tejasg99/virtual-EMS-backend.git
cd virtual-event-backend
```
2. Install dependencies:
```
npm install
```
3. Create .env file: Copy .env.sample or create .env manually and fill in the required environment variables as listed in the sample file

4. Seed Initial Admin User:
```
npm run seed:admin
```

## Running the server
* Development Mode (with hot-reloading using nodemon):
```
npm run dev
```
* Production Mode: 
```
npm start
```
Ensure NODE_ENV is set to production in your environment for optimal performance and security settings.