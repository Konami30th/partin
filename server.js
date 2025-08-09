const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {}; // roomId => { password, users: { socketId: {name, photo, micOn}} }

io.on('connection', (socket) => {
  socket.on('joinRoom', ({roomId, password, name, photo}, callback) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { password, users: {} };
    }
    if (rooms[roomId].password !== password) {
      return callback({ error: 'کلمه عبور اشتباه است!' });
    }
    rooms[roomId].users[socket.id] = { name, photo, micOn: false };
    socket.join(roomId);

    // Inform existing users about the new user
    io.to(roomId).emit('updateUsers', rooms[roomId].users);
    callback({ success: true, users: rooms[roomId].users });

    // Notify all users in room about join
    socket.to(roomId).emit('message', {
      system: true,
      text: `${name} به چت اضافه شد.`
    });
  });

  socket.on('sendMessage', ({roomId, message}) => {
    const user = rooms[roomId]?.users[socket.id];
    if (!user) return;
    io.to(roomId).emit('message', {
      user,
      text: message,
      type: 'text',
    });
  });

  socket.on('sendVoice', ({roomId, voiceBlob}) => {
    const user = rooms[roomId]?.users[socket.id];
    if (!user) return;
    io.to(roomId).emit('message', {
      user,
      voiceBlob,
      type: 'voice',
    });
  });

  socket.on('micToggle', ({roomId, micOn}) => {
    if (rooms[roomId]?.users[socket.id]) {
      rooms[roomId].users[socket.id].micOn = micOn;
      io.to(roomId).emit('updateUsers', rooms[roomId].users);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (rooms[roomId].users[socket.id]) {
        const name = rooms[roomId].users[socket.id].name;
        delete rooms[roomId].users[socket.id];
        io.to(roomId).emit('updateUsers', rooms[roomId].users);
        io.to(roomId).emit('message', {
          system: true,
          text: `${name} چت را ترک کرد.`
        });
        // If no users left, remove room
        if (Object.keys(rooms[roomId].users).length === 0) {
          delete rooms[roomId];
        }
        break;
      }
    }
  });
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
