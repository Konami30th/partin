const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // { roomId: { password, clients: Set<WebSocket> } }

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      if(data.type === 'join') {
        const { roomId, password } = data;
        if(!rooms[roomId]) {
          rooms[roomId] = { password, clients: new Set() };
        }
        if(rooms[roomId].password !== password) {
          ws.send(JSON.stringify({ type: 'error', message: 'رمز عبور اشتباه است' }));
          return;
        }
        ws.roomId = roomId;
        rooms[roomId].clients.add(ws);
        ws.send(JSON.stringify({ type: 'joined', clientsCount: rooms[roomId].clients.size }));
        broadcastExcept(ws, roomId, JSON.stringify({ type: 'user-joined' }));
      }
      else if(data.type === 'signal') {
        broadcastExcept(ws, ws.roomId, JSON.stringify({
          type: 'signal',
          from: data.from,
          signalData: data.signalData
        }));
      }
      else if(data.type === 'chat') {
        broadcastExcept(ws, ws.roomId, JSON.stringify({
          type: 'chat',
          from: data.from,
          message: data.message
        }));
      }
    } catch (e) {
      console.error('Invalid message:', message);
    }
  });

  ws.on('close', () => {
    if(ws.roomId && rooms[ws.roomId]) {
      rooms[ws.roomId].clients.delete(ws);
      broadcastExcept(ws, ws.roomId, JSON.stringify({ type: 'user-left' }));
      if(rooms[ws.roomId].clients.size === 0) {
        delete rooms[ws.roomId];
      }
    }
  });
});

function broadcastExcept(sender, roomId, msg) {
  if(!rooms[roomId]) return;
  for(const client of rooms[roomId].clients) {
    if(client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

setInterval(() => {
  wss.clients.forEach(ws => {
    if(!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
