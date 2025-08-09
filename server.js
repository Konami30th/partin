const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // roomId -> array of user objects {id, username, micOn, volume, profilePicDataUrl}

io.on('connection', (socket) => {
  console.log('یک کاربر متصل شد:', socket.id);

  socket.on('joinRoom', ({ roomId, username, password, profilePicDataUrl }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    rooms[roomId].push({ id: socket.id, username, micOn: false, volume: 1, profilePicDataUrl });

    io.to(roomId).emit('roomUsers', rooms[roomId]);

    socket.emit('message', { username: 'سیستم', text: `به روم ${roomId} خوش آمدید، ${username}!`, profilePicDataUrl: null });
    socket.to(roomId).emit('message', { username: 'سیستم', text: `${username} به روم پیوست.`, profilePicDataUrl: null });
  });

  socket.on('chatMessage', (msg) => {
    const user = findUser(socket.id);
    if (!user) return;
    io.to(getUserRoom(socket.id)).emit('message', {
      username: user.username,
      text: msg,
      profilePicDataUrl: user.profilePicDataUrl
    });
  });

  socket.on('audioMessage', (audioBlob) => {
    const user = findUser(socket.id);
    if (!user) return;
    // دقت کنید برای ارسال فایل صوتی از socket.io باید با buffer یا base64 کار شود.
    // اینجا نمونه ساده ارسال base64 می‌زنیم:

    const reader = new FileReader();

    // FileReader روی سرور کار نمی‌کند؛ پس باید از Buffer استفاده کنیم
    // برای همین audioBlob را باید در کلاینت تبدیل به base64 کنیم و ارسال کنیم
    // در اینجا فرض می‌کنیم در کلاینت ارسال base64 شده است.

    // پس در کلاینت هنگام emit به جای Blob باید base64 ارسال شود (در room.js تغییر نیاز دارد)

    // پس این قسمت را در سرور به روز می‌کنیم به شکل زیر:

  });

  socket.on('micStatus', (micOn) => {
    const user = findUser(socket.id);
    if (!user) return;
    user.micOn = micOn;
    io.to(getUserRoom(socket.id)).emit('roomUsers', rooms[getUserRoom(socket.id)]);
  });

  socket.on('disconnect', () => {
    const roomId = getUserRoom(socket.id);
    if (!roomId) return;

    rooms[roomId] = rooms[roomId].filter(u => u.id !== socket.id);
    io.to(roomId).emit('roomUsers', rooms[roomId]);
    io.to(roomId).emit('message', { username: 'سیستم', text: 'یک کاربر از روم خارج شد.', profilePicDataUrl: null });
  });

  function findUser(id) {
    for (const roomId in rooms) {
      const user = rooms[roomId].find(u => u.id === id);
      if (user) return user;
    }
    return null;
  }

  function getUserRoom(id) {
    for (const roomId in rooms) {
      if (rooms[roomId].some(u => u.id === id)) return roomId;
    }
    return null;
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`سرور روی پورت ${PORT} اجرا شد`));
