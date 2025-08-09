const socket = io();

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const username = urlParams.get('username');
const password = urlParams.get('password');

if (!roomId || !username || !password) {
  alert('لطفاً همه فیلدها را به درستی وارد کنید!');
  window.location.href = 'index.html';
}

socket.emit('joinRoom', { roomId, username, password });

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

// نمایش کاربران حاضر در روم و وضعیت میکروفون
socket.on('roomUsers', (users) => {
  usersList.innerHTML = '<b>کاربران حاضر:</b><br>' +
    users.map(u => `${u.username} - میکروفون: ${u.micOn ? 'روشن' : 'خاموش'}`).join('<br>');
});

// دریافت پیام جدید
socket.on('message', (message) => {
  const div = document.createElement('div');
  div.classList.add('chat-message');
  div.innerHTML = `<b>${message.username}:</b> ${message.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// ارسال پیام فرم
messageForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit('chatMessage', msg);
  messageInput.value = '';
});

// ضبط صدا
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
          sendAudioBtn.disabled = true;
          audioChunks = [];
        };
      };
      startRecordBtn.disabled = true;
      stopRecordBtn.disabled = false;
    });
});

// توقف ضبط
stopRecordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    startRecordBtn.disabled = false;
    stopRecordBtn.disabled = true;
  }
});

// دریافت پیام صوتی
socket.on('audioMessage', (data) => {
  // data باید به صورت blob یا base64 ارسال شود
  const audioElem = document.createElement('audio');
  audioElem.controls = true;
  audioElem.src = URL.createObjectURL(data);
  chatBox.appendChild(audioElem);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// کنترل میکروفون
toggleMicBtn.addEventListener('click', () => {
  localMicOn = !localMicOn;
  socket.emit('micStatus', localMicOn);
  micStatusSpan.innerText = localMicOn ? 'میکروفون روشن' : 'میکروفون خاموش';
});

// تنظیم ولوم برای کاربران دیگر (نمونه ساده)
socket.on('volumeSet', ({ targetId, volume }) => {
  // در اینجا می‌توانی ولوم را روی صدای کاربر مورد نظر اعمال کنی
  console.log(`تنظیم ولوم ${volume} برای کاربر ${targetId}`);
});
