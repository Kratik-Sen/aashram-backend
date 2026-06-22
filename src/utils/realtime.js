const { Server } = require("socket.io");

let io;

const initRealtime = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on("connection", (socket) => {
    socket.emit("inventory:ready", { connected: true });
  });

  return io;
};

const emitInventoryUpdate = (payload = {}) => {
  if (!io) return;

  io.emit("inventory:updated", {
    at: new Date().toISOString(),
    ...payload
  });
};

module.exports = { initRealtime, emitInventoryUpdate };
