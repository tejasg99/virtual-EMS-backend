import { nanoid } from "nanoid";

/**
 * Generates a unique, URL-friendly room name.
 * Example format: meeting-abc123xyz
 * @param {number} [length=10] - The length of the random part of the room name.
 * @returns {string} A unique room name string.
*/

export const generateUniqueRoomName = (length = 10) => {
    //prefix and random string
    const prefix = 'meeting-';
    const random = nanoid(length); //generates a random string of length 10
    return `${prefix}${random}`;
};