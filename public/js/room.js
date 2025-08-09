const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const username = urlParams.get('username');
const password = urlParams.get('password');

const profilePicDataUrl = localStorage.getItem('profilePicDataUrl');

if (!roomId || !username || !password) {
  alert('لطفاً همه فیلدها را به درستی وارد کنید!');
  window.location.href = 'index.html';
}

socket.emit('joinRoom', { roomId, username, password, profilePicDataUrl });

const usersList = document.getElementById('usersList');
const chatBox = document.getElementById('chatBox');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

const startRecordBtn = document.getElementById('startRecord');
const stopRecordBtn = document.getElementById('stopRecord');
const audioPlayback = document.getElementById('audioPlayback');
const sendAudioBtn = document.getElementById('sendAudio');
const toggleMicBtn = document.getElementById('toggleMic');
const micStatusSpan = document.getElementById('micStatus');

let mediaRecorder;
let audioChunks = [];
let localMicOn = false;

let users = [];

socket.on('roomUsers', (usersArray) => {
  users = usersArray;
  usersList.innerHTML = '<b>کاربران حاضر:</b><br>' +
    users.map(u => `
      <div style="display:flex; align-items:center; margin-bottom:5px;">
        <img src="${u.profilePicDataUrl || 'default-avatar.png'}" alt="avatar" style="width:30px; height:30px; border-radius:50%; margin-left:8px;" />
        <span>${u.username} - میکروفون: ${u.micOn ? 'روشن' : 'خاموش'}</span>
      </div>
    `).join('');
});

socket.on('message', (message) => {
  const div = document.createElement('div');
  div.classList.add('chat-message');
  div.innerHTML = `<img src="${message.profilePicDataUrl || 'default-avatar.png'}" alt="avatar" /> <b>${message.username}:</b> ${message.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', msg);
  messageInput.value = '';
});

startRecordBtn.addEventListener('click', () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('ضبط صدا توسط مرورگر شما پشتیبانی نمی‌شود.');
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;
        audioPlayback.style.display = 'block';
        sendAudioBtn.disabled = false;

        sendAudioBtn.onclick = () => {
          sendAudioBtn.disabled = true;
          socket.emit('audioMessage', audioBlob);
          audioPlayback.style.display = 'none';
          audioChunks = [];
        };
      };
      startRecordBtn.disabled = true;
      stopRecordBtn.disabled = false;
    });
});

stopRecordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    startRecordBtn.disabled = false;
    stopRecordBtn.disabled = true;
  }
});

socket.on('audioMessage', (data) => {
  const audioElem = document.createElement('audio');
  audioElem.controls = true;
  audioElem.src = URL.createObjectURL(data);
  chatBox.appendChild(audioElem);
  chatBox.scrollTop = chatBox.scrollHeight;
});

toggleMicBtn.addEventListener('click', () => {
  localMicOn = !localMicOn;
  socket.emit('micStatus', localMicOn);
  micStatusSpan.innerText = localMicOn ? 'میکروفون روشن' : 'میکروفون خاموش';
});
