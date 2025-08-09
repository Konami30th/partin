const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {}; // { roomId: { password, users: [{id, name, pic, socketId, micOn}], maxUsers:4 } }

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, password, userName, profilePic }, cb) => {
    if (!roomId || !password || !userName) {
      cb({ success: false, error: 'Missing roomId, password or userName' });
      return;
    }

    let room = rooms[roomId];

    if (room) {
      // Room exists: check password
      if (room.password !== password) {
        cb({ success: false, error: 'Room exists but wrong password. Please use correct password or change Room ID.' });
        return;
      }
      if (room.users.length >= room.maxUsers) {
        cb({ success: false, error: 'Room is full (max 4 users).' });
        return;
      }
    } else {
      // Create new room
      rooms[roomId] = {
        password,
        users: [],
        maxUsers: 4,
      };
      room = rooms[roomId];
    }

    // Add user to room
    const userObj = {
      id: socket.id,
      name: userName,
      pic: profilePic || 'images/default-avatar.png',
      socketId: socket.id,
      micOn: false,
    };
    room.users.push(userObj);

    socket.join(roomId);

    // Send user list to room
    io.to(roomId).emit('room-users', room.users);

    cb({ success: true, roomUsers: room.users });

    // Inform others
    socket.to(roomId).emit('user-joined', userObj);

    // Handle disconnect
    socket.on('disconnect', () => {
      if (!rooms[roomId]) return;
      rooms[roomId].users = rooms[roomId].users.filter(u => u.id !== socket.id);
      io.to(roomId).emit('room-users', rooms[roomId].users);
      socket.to(roomId).emit('user-left', socket.id);
      // Delete room if empty
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      }
    });

    // Handle mic toggle
    socket.on('mic-toggle', micStatus => {
      if (!rooms[roomId]) return;
      const user = rooms[roomId].users.find(u => u.id === socket.id);
      if (user) {
        user.micOn = micStatus;
        io.to(roomId).emit('mic-status-changed', { userId: socket.id, micOn: micStatus });
      }
    });

    // Chat message send
    socket.on('chat-message', data => {
      io.to(roomId).emit('chat-message', data);
    });

    // Voice message send
    socket.on('voice-message', data => {
      io.to(roomId).emit('voice-message', data);
    });

    // Volume change per user
    socket.on('volume-change', ({ targetUserId, volume }) => {
      socket.to(roomId).emit('volume-changed', { targetUserId, volume });
    });
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
