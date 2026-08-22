import PartySocket from "partysocket";
import { LIVE_MESSAGE_TYPES } from "./liveProtocol.js";

/**
 * Connect to a live room via PartyKit
 * @param {string} host - The PartyKit host (e.g. 'pibulus-party.your-username.partykit.dev')
 * @param {string} roomId - The room ID to connect to
 * @param {Object} options - options object containing avatar, password, etc.
 * @param {Object} callbacks - Event callbacks (onInit, onPresence, onUpdate, onConnect, onDisconnect, onError)
 * @returns {PartySocket} The PartySocket connection
 */
export function connectToLiveRoom(host, roomId, options = {}, callbacks = {}) {
  const { avatar = "Guest", password = null } = options;
  
  if (!host) {
    throw new Error("A PartyKit host is required to connect to a live room.");
  }

  // Strip https:// if passed, PartySocket handles it natively
  const normalizedHost = host.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  const query = { avatar };
  if (password) {
    query.pwd = password;
  }

  const socket = new PartySocket({
    host: normalizedHost,
    room: roomId,
    query,
  });

  // Handle incoming messages
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case LIVE_MESSAGE_TYPES.INIT:
          callbacks.onInit?.(message.data);
          break;

        case LIVE_MESSAGE_TYPES.PRESENCE:
          callbacks.onPresence?.(message.data);
          break;

        default:
          // For all other generic or custom messages, pass them directly to the app
          callbacks.onUpdate?.(message);
          break;
      }
    } catch (error) {
      console.error("[PartyService] Failed to parse message:", error);
    }
  });

  socket.addEventListener("open", () => callbacks.onConnect?.());
  socket.addEventListener("close", (event) => callbacks.onDisconnect?.(event));
  socket.addEventListener("error", (error) => {
    console.error("[PartyService] WebSocket error:", error);
    callbacks.onError?.(error);
  });

  return socket;
}

/**
 * Send a generic state update to the room
 */
export function sendUpdate(socket, type, data) {
  if (!socket || socket.readyState !== PartySocket.OPEN) {
    console.warn("[PartyService] Cannot send update, socket not open");
    return false;
  }

  try {
    socket.send(JSON.stringify({ type, data }));
    return true;
  } catch (error) {
    console.error("[PartyService] Failed to send update:", error);
    return false;
  }
}
