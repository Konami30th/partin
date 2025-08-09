const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {};

io.on('connection', socket => {
  console.log('کاربر متصل شد:', socket.id);

  socket.on('joinRoom', ({ roomId, username, password }) => {
    // ساده سازی رمز عبور (برای نمونه)  
    // تو اینجا می‌تونی چک کنی رمز درست است یا نه
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, username, micOn: false, volume: 1 });

    io.to(roomId).emit('roomUsers', rooms[roomId]);

    socket.emit('message', { username: 'سیستم', text: `به روم ${roomId} خوش آمدید، ${username}!` });
    socket.to(roomId).emit('message', { username: 'سیستم', text: `${username} وارد روم شد.` });
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

  // مدیریت تغییر وضعیت میکروفون
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

  // مدیریت تغییر ولوم
  socket.on('setVolume', ({ targetId, volume }) => {
    for (const roomId in rooms) {
      if (rooms[roomId].some(u => u.id === socket.id)) {
        // به کاربر هدف volume اختصاص بده
        // اینجا فقط emit می‌کنیم چون ولوم سمت کلاینت تنظیم می‌شود
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
        io.to(roomId).emit('message', { username: 'سیستم', text: `${username} روم را ترک کرد.` });
        break;
      }
    }
    console.log('کاربر قطع شد:', socket.id);
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
