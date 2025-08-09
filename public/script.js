const socket = io();

const joinSection = document.getElementById('join-section');
const chatSection = document.getElementById('chat-section');
const joinBtn = document.getElementById('join-btn');
const joinError = document.getElementById('join-error');
const loadingJoin = document.getElementById('loading-join');

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

function compressImage(file, maxWidth = 200, maxHeight = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      image.src = event.target.result;
    };
    image.onload = () => {
      let width = image.width;
      let height = image.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height *= maxWidth / width;
          width = maxWidth;
        } else {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob(blob => {
        resolve(blob);
      }, 'image/jpeg', quality);
    };
    image.onerror = error => reject(error);
  });
}

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const roomId = roomInput.value.trim();
  const password = passwordInput.value.trim();
  if (!name || !roomId || !password) {
    joinError.textContent = 'لطفا همه فیلدها را پر کنید';
    return;
  }
  joinError.textContent = '';
  loadingJoin.classList.remove('hidden');
  joinBtn.disabled = true;

  if (photoInput.files.length > 0) {
    const file = photoInput.files[0];
    compressImage(file).then(compressedBlob => {
      const reader = new FileReader();
      reader.onload = () => {
        joinRoom(name, roomId, password, reader.result);
      };
      reader.readAsDataURL(compressedBlob);
    }).catch(() => {
      // اگر فشرده سازی نشد، همان عکس اصلی را بفرست
      const reader = new FileReader();
      reader.onload = () => {
        joinRoom(name, roomId, password, reader.result);
      };
      reader.readAsDataURL(file);
    });
  } else {
    joinRoom(name, roomId, password, null);
  }
});

function joinRoom(name, roomId, password, photo) {
  socket.emit('joinRoom', { roomId, password, name, photo }, (response) => {
    loadingJoin.classList.add('hidden');
    joinBtn.disabled = false;
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

// ضبط صدا

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
  if (recordedChunks.length === 0) {
    alert('هیچ صدایی ضبط نشده است.');
    return;
  }
  const blob = new Blob(recordedChunks, { type: 'audio/webm' });
  const reader = new FileReader();
  reader.onloadend = () => {
    socket.emit('sendVoice', { roomId: currentRoom, voiceBlob: reader.result });
    voicePreview.classList.add('hidden');
    voiceAudio.src = '';
    recordedChunks = [];
  };
  reader.readAsDataURL(blob);
});

cancelVoiceBtn.addEventListener('click', () => {
  voicePreview.classList.add('hidden');
  voiceAudio.src = '';
  recordedChunks = [];
});

// کلید قطع/وصل میکروفون

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
