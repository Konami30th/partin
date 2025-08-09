const socket = io();

const userName = sessionStorage.getItem('userName');
const roomId = sessionStorage.getItem('roomId');
const password = sessionStorage.getItem('password');
const profilePic = sessionStorage.getItem('profilePic') || 'images/default-avatar.png';

const usersList = document.getElementById('users-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const micToggleBtn = document.getElementById('mic-toggle-btn');
const startRecordBtn = document.getElementById('start-record-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

let micOn = false;
let mediaRecorder = null;
let recordedChunks = [];

// Theme functions
function applyTheme(theme) {
  const body = document.body;
  if (theme === 'dark') {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
  }
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);

window.addEventListener('DOMContentLoaded', () => {
  applyTheme(localStorage.getItem('theme') || 'light');
});

// Join room
socket.emit('join-room', { roomId, password, userName, profilePic }, (res) => {
  if (!res.success) {
    alert(res.error);
    window.location.href = '/';
  } else {
    updateUsersList(res.roomUsers);
  }
});

// Update users list UI
function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(u => {
    const userItem = document.createElement('div');
    userItem.classList.add('user-item');
    userItem.id = `user-${u.id}`;

    userItem.innerHTML = `
      <img src="${u.pic}" alt="Profile" class="user-pic" />
      <div class="user-info">${u.name}</div>
      <div class="mic-status">${u.micOn ? '🎤 On' : '🎤 Off'}</div>
    `;

    usersList.appendChild(userItem);
  });
}

// Add chat message UI
function addMessage(msgObj) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message-item');
  if (msgObj.userName === userName) msgDiv.classList.add('self');

  msgDiv.innerHTML = `
    <img src="${msgObj.profilePic || 'images/default-avatar.png'}" alt="Profile" class="msg-user-pic" />
    <div class="message-bubble">
      <strong>${msgObj.userName}</strong><br/>
      ${msgObj.type === 'audio' 
        ? `<audio controls src="${msgObj.message}"></audio>` 
        : `<span>${msgObj.message}</span>`
      }
    </div>
  `;

  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Send text message
sendBtn.addEventListener('click', () => {
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit('chat-message', { type: 'text', message: msg, userName, profilePic });
  messageInput.value = '';
});

// Also send message on Enter key
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendBtn.click();
  }
});

// Mic toggle
micToggleBtn.addEventListener('click', () => {
  micOn = !micOn;
  socket.emit('mic-toggle', micOn);
  micToggleBtn.textContent = micOn ? '🔇' : '🎤';
});

// Update mic status for users
socket.on('mic-status-changed', ({ userId, micOn }) => {
  const userDiv = document.getElementById(`user-${userId}`);
  if (userDiv) {
    const micStatusDiv = userDiv.querySelector('.mic-status');
    micStatusDiv.textContent = micOn ? '🎤 On' : '🎤 Off';
  }
});

// User joined/left updates
socket.on('room-users', updateUsersList);
socket.on('user-joined', user => {
  updateUsersList([...document.querySelectorAll('.user-item')].map(u => ({
    id: u.id.replace('user-', ''),
    name: u.querySelector('.user-info').textContent,
    pic: u.querySelector('img').src,
    micOn: u.querySelector('.mic-status').textContent.includes('On')
  })).concat([user]));
});
socket.on('user-left', userId => {
  const userDiv = document.getElementById(`user-${userId}`);
  if (userDiv) userDiv.remove();
});

// Receive chat message
socket.on('chat-message', addMessage);

// Voice recording functionality
startRecordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    startRecordBtn.textContent = '🎙️';
  } else {
    startRecording();
  }
});

function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Audio recording not supported in this browser.');
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      const audioURL = URL.createObjectURL(audioBlob);

      // Confirm sending voice message
      if (confirm('Send recorded voice message?')) {
        socket.emit('voice-message', {
          type: 'audio',
          message: audioURL,
          userName,
          profilePic,
        });
      }
    };

    mediaRecorder.start();
    startRecordBtn.textContent = '⏹️'; // Stop icon
  }).catch(() => {
    alert('Permission denied or error accessing mic.');
  });
}

// Receive voice message
socket.on('voice-message', addMessage);
