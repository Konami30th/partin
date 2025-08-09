const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {};

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', ({ roomId, username, password }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, username, micOn: false, volume: 1 });

    io.to(roomId).emit('roomUsers', rooms[roomId]);

    socket.emit('message', { username: 'System', text: `Welcome to room ${roomId}, ${username}!` });
    socket.to(roomId).emit('message', { username: 'System', text: `${username} has joined the room.` });
  });

  socket.on('chatMessage', msg => {
    let roomIdFound = null;
    let user = null;
    for (const roomId in rooms) {
      user = rooms[roomId].find(u => u.id === socket.id);
      if (user) {
        roomIdFound = roomId;
        break;
      }
    }
    if (roomIdFound && user) {
      io.to(roomIdFound).emit('message', { username: user.username, text: msg });
    }
  });

  socket.on('micStatus', (isOn) => {
    for (const roomId in rooms) {
      const user = rooms[roomId].find(u => u.id === socket.id);
      if (user) {
        user.micOn = isOn;
        io.to(roomId).emit('roomUsers', rooms[roomId]);
        break;
      }
    }
  });

  socket.on('setVolume', ({ targetId, volume }) => {
    for (const roomId in rooms) {
      if (rooms[roomId].some(u => u.id === socket.id)) {
        socket.emit('volumeSet', { targetId, volume });
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const idx = rooms[roomId].findIndex(u => u.id === socket.id);
      if (idx !== -1) {
        const username = rooms[roomId][idx].username;
        rooms[roomId].splice(idx, 1);
        io.to(roomId).emit('roomUsers', rooms[roomId]);
        io.to(roomId).emit('message', { username: 'System', text: `${username} has left the room.` });
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
