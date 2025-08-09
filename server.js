const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// Map of rooms: roomId -> password
const rooms = {};

// Map to keep track of users in rooms
const usersInRooms = {}; // roomId -> [{socketId, userName, profilePic, micStatus}]

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ roomId, password, userName, profilePic }) => {
    if (rooms[roomId]) {
      if (rooms[roomId] !== password) {
        socket.emit('room_password_error', 'Room already exists. Please change room ID or enter the correct password.');
        return;
      }
    } else {
      rooms[roomId] = password; // create room with password
      usersInRooms[roomId] = [];
    }

    socket.join(roomId);

    // Add user to room list
    usersInRooms[roomId].push({
      socketId: socket.id,
      userName,
      profilePic,
      micStatus: false
    });

    // Send updated user list to all in room
    io.to(roomId).emit('update_user_list', usersInRooms[roomId]);

    socket.emit('joined_room', roomId);

    // Listen for chat messages
    socket.on('send_message', (msg) => {
      io.to(roomId).emit('receive_message', {
        userName,
        profilePic,
        message: msg,
        type: 'text'
      });
    });

    // Listen for audio messages
    socket.on('send_audio', (audioBase64) => {
      io.to(roomId).emit('receive_message', {
        userName,
        profilePic,
        message: audioBase64,
        type: 'audio'
      });
    });

    // Listen for mic status changes
    socket.on('mic_status_change', (status) => {
      const user = usersInRooms[roomId].find(u => u.socketId === socket.id);
      if (user) {
        user.micStatus = status;
        io.to(roomId).emit('update_user_list', usersInRooms[roomId]);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (!usersInRooms[roomId]) return;
      usersInRooms[roomId] = usersInRooms[roomId].filter(u => u.socketId !== socket.id);
      io.to(roomId).emit('update_user_list', usersInRooms[roomId]);
      // If room empty, delete it
      if (usersInRooms[roomId].length === 0) {
        delete rooms[roomId];
        delete usersInRooms[roomId];
      }
    });
  });
});

http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
