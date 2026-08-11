export function registerRoomHandlers (io, socket) {
  
  const username = socket.user?.username || "Anonymous";

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

    socket.to(roomId).emit("user_joined", {
      userId: socket.id,
      username: username,
      message: "A user joined the room"
    });
  });

  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
    console.log(`User ${username} (${socket.id}) left room: ${roomId}`);

    socket.to(roomId).emit("user_left", {
      userId: socket.id,
      username: username,
      message: "A user left the room"
    });
  });
};