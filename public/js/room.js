const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const password = urlParams.get('password');
const userName = localStorage.getItem('userName') || 'Anonymous';
const profilePic = localStorage.getItem('profilePic') || 'default-avatar.png';

const usersListDiv = document.getElementById('users-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const micToggleBtn = document.getElementById('mic-toggle-btn');
const startRecordBtn = document.getElementById('start-record-btn');
const audioControlsDiv = document.getElementById('audio-controls');
const playAudioBtn = document.getElementById('play-audio-btn');
const pauseAudioBtn = document.getElementById('pause-audio-btn');
const cancelAudioBtn = document.getElementById('cancel-audio-btn');
const confirmAudioBtn = document.getElementById('confirm-audio-btn');

let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob;
let audioURL;
let audioPlayer;
let micOn = false;

function addUserToList(users) {
  usersListDiv.innerHTML = '';
  users.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.className = 'user-item';
    userDiv.innerHTML = `
      <img src="${user.profilePic || 'default-avatar.png'}" alt="Profile" class="user-pic" />
      <span class="user-name">${user.userName}</span>
      <span class="mic-status">${user.micStatus ? '🎤 ON' : '🎤 OFF'}</span>
    `;
    usersListDiv.appendChild(userDiv);
  });
}

function addMessage(msgObj) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message-item';
  let contentHTML = `
    <img src="${msgObj.profilePic || 'default-avatar.png'}" class="msg-user-pic" alt="Profile" />
    <strong>${msgObj.userName}:</strong> 
  `;

  if (msgObj.type === 'text') {
    contentHTML += `<span>${msgObj.message}</span>`;
  } else if (msgObj.type === 'audio') {
    contentHTML += `
      <audio controls src="${msgObj.message}"></audio>
    `;
  }

  msgDiv.innerHTML = contentHTML;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

socket.on('connect', () => {
  socket.emit('join_room', { roomId, password, userName, profilePic });
});

socket.on('room_password_error', (msg) => {
  alert(msg);
  window.location.href = '/'; // redirect back to login
});

socket.on('joined_room', () => {
  console.log('Joined room:', roomId);
});

socket.on('update_user_list', (users) => {
  addUserToList(users);
});

socket.on('receive_message', (msgObj) => {
  addMessage(msgObj);
});

// Send text message
sendBtn.addEventListener('click', () => {
  const msg = messageInput.value.trim();
  if (msg) {
    socket.emit('send_message', msg);
    messageInput.value = '';
  }
});

// Mic toggle
micToggleBtn.addEventListener('click', () => {
  micOn = !micOn;
  micToggleBtn.innerText = micOn ? 'Mic ON' : 'Mic OFF';
  socket.emit('mic_status_change', micOn);
});

// Voice recording logic
startRecordBtn.addEventListener('click', async () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    audioChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        audioURL = URL.createObjectURL(recordedAudioBlob);
        audioPlayer = new Audio(audioURL);

        audioControlsDiv.style.display = 'block';
      };

      startRecordBtn.disabled = true;
    } catch (err) {
      alert('Error accessing microphone: ' + err.message);
    }
  }
});

// Audio control buttons
playAudioBtn.addEventListener('click', () => {
  if (audioPlayer) audioPlayer.play();
});
pauseAudioBtn.addEventListener('click', () => {
  if (audioPlayer) audioPlayer.pause();
});
cancelAudioBtn.addEventListener('click', () => {
  audioControlsDiv.style.display = 'none';
  startRecordBtn.disabled = false;
  audioChunks = [];
  recordedAudioBlob = null;
  audioURL = null;
  audioPlayer = null;
});
confirmAudioBtn.addEventListener('click', () => {
  if (!recordedAudioBlob) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    socket.emit('send_audio', reader.result);
    audioControlsDiv.style.display = 'none';
    startRecordBtn.disabled = false;
  };
  reader.readAsDataURL(recordedAudioBlob);
});
