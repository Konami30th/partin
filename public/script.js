const socket = io();

const joinSection = document.getElementById('join-section');
const chatSection = document.getElementById('chat-section');
const joinBtn = document.getElementById('join-btn');
const joinError = document.getElementById('join-error');

const nameInput = document.getElementById('name-input');
const roomInput = document.getElementById('room-input');
const passwordInput = document.getElementById('password-input');
const photoInput = document.getElementById('photo-input');

const usersList = document.getElementById('users-list');
const messagesDiv = document.getElementById('messages');

const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

const recordBtn = document.getElementById('record-btn');
const voicePreview = document.getElementById('voice-preview');
const voiceAudio = document.getElementById('voice-audio');
const sendVoiceBtn = document.getElementById('send-voice-btn');
const cancelVoiceBtn = document.getElementById('cancel-voice-btn');

const micToggleBtn = document.getElementById('mic-toggle-btn');

let mediaRecorder;
let recordedChunks = [];
let recording = false;

let currentUser = null;
let currentRoom = null;

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  for(let i=0; i<n; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], {type:mime});
}

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const roomId = roomInput.value.trim();
  const password = passwordInput.value.trim();
  if (!name || !roomId || !password) {
    joinError.textContent = 'لطفا همه فیلدها را پر کنید';
    return;
  }
  if (photoInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = () => {
      joinRoom(name, roomId, password, reader.result);
    };
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    // default photo
    joinRoom(name, roomId, password, null);
  }
});

function joinRoom(name, roomId, password, photo) {
  socket.emit('joinRoom', { roomId, password, name, photo }, (response) => {
    if (response.error) {
      joinError.textContent = response.error;
    } else {
      currentUser = { name, photo: photo || 'https://i.pravatar.cc/150?u=' + name };
      currentRoom = roomId;
      joinSection.classList.add('hidden');
      chatSection.classList.remove('hidden');
      joinError.textContent = '';
      renderUsers(response.users);
      addSystemMessage('شما وارد شدید');
    }
  });
}

sendBtn.addEventListener('click', () => {
  sendMessage();
});
messageInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit('sendMessage', { roomId: currentRoom, message: msg });
  messageInput.value = '';
}

function renderUsers(users) {
  usersList.innerHTML = '';
  for (const [id, user] of Object.entries(users)) {
    const li = document.createElement('li');

    const photoDiv = document.createElement('div');
    photoDiv.classList.add('user-photo');
    photoDiv.style.backgroundImage = `url(${user.photo || 'https://i.pravatar.cc/150?u=' + user.name})`;
    li.appendChild(photoDiv);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = user.name;
    nameSpan.style.flexGrow = '1';
    li.appendChild(nameSpan);

    const micSpan = document.createElement('span');
    micSpan.classList.add('mic-status');
    if (user.micOn) {
      micSpan.textContent = '🎤';
      micSpan.classList.remove('mic-off');
    } else {
      micSpan.textContent = '🔇';
      micSpan.classList.add('mic-off');
    }
    li.appendChild(micSpan);

    // TODO: add volume control & speaker mute UI per user here (could be added later)
    usersList.appendChild(li);
  }
}

socket.on('updateUsers', (users) => {
  renderUsers(users);
});

socket.on('message', (msg) => {
  if (msg.system) {
    addSystemMessage(msg.text);
    return;
  }
  addChatMessage(msg);
});

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.classList.add('message', 'system-message');
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addChatMessage({ user, text, type, voiceBlob }) {
  const div = document.createElement('div');
  div.classList.add('message');

  const photoDiv = document.createElement('div');
  photoDiv.classList.add('user-photo');
  photoDiv.style.backgroundImage = `url(${user.photo || 'https://i.pravatar.cc/150?u=' + user.name})`;
  div.appendChild(photoDiv);

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');

  if (type === 'voice' && voiceBlob) {
    contentDiv.classList.add('voice-message');
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = voiceBlob;
    contentDiv.appendChild(audio);
  } else {
    contentDiv.textContent = text;
  }

  div.appendChild(contentDiv);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Voice recording logic

recordBtn.addEventListener('click', () => {
  if (recording) {
    stopRecording();
  } else {
    startRecording();
  }
});

function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.');
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      voiceAudio.src = url;
      voiceAudio.load();
      voicePreview.classList.remove('hidden');

      // Store blob for sending later
      voicePreview.dataset.blobUrl = url;
      voicePreview.dataset.blob = blob;
    };

    mediaRecorder.start();
    recording = true;
    recordBtn.textContent = '⏹️ پایان ضبط';
  }).catch(() => {
    alert('دسترسی به میکروفون رد شد.');
  });
}

function stopRecording() {
  if (mediaRecorder && recording) {
    mediaRecorder.stop();
    recording = false;
    recordBtn.textContent = '🎤 ضبط صدا';
  }
}

sendVoiceBtn.addEventListener('click', () => {
  const blob = voicePreview.dataset.blob;
  if (!blob) return;
  // Convert Blob to base64 to send via socket.io
  const reader = new FileReader();
  reader.onloadend = () => {
    socket.emit('sendVoice', { roomId: currentRoom, voiceBlob: reader.result });
  };
  reader.readAsDataURL(blob);
  voicePreview.classList.add('hidden');
});

cancelVoiceBtn.addEventListener('click', () => {
  voicePreview.classList.add('hidden');
  voiceAudio.src = '';
  voicePreview.dataset.blob = null;
  voicePreview.dataset.blobUrl = null;
});

// Mic toggle logic

micToggleBtn.addEventListener('click', () => {
  if (micToggleBtn.classList.contains('active')) {
    micToggleBtn.classList.remove('active');
    micToggleBtn.textContent = '🔇 میکروفون خاموش';
    socket.emit('micToggle', { roomId: currentRoom, micOn: false });
  } else {
    micToggleBtn.classList.add('active');
    micToggleBtn.textContent = '🎤 میکروفون روشن';
    socket.emit('micToggle', { roomId: currentRoom, micOn: true });
  }
});
