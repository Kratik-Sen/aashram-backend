const { Server } = require("socket.io");
const { getAllowedOrigins } = require("../config/urls");

let io;

const initRealtime = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on("connection", (socket) => {
    socket.emit("inventory:ready", { connected: true });
  });

  return io;
};

const normalizeAreas = (payload) => {
  const areas = [
    payload.area,
    ...(Array.isArray(payload.areas) ? payload.areas : [])
  ].filter(Boolean);

  return [...new Set(areas)];
};

const emitInventoryUpdate = (payload = {}) => {
  if (!io) return;
  const areas = normalizeAreas(payload);

  io.emit("inventory:updated", {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: new Date().toISOString(),
    area: payload.area || areas[0] || "dashboard",
    areas,
    ...payload
  });
};

module.exports = { initRealtime, emitInventoryUpdate };
