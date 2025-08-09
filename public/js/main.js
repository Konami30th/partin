const joinForm = document.getElementById('join-form');
const profilePicInput = document.getElementById('profilePic');
const themeToggleBtn = document.getElementById('theme-toggle');
const formError = document.getElementById('form-error');

let selectedProfilePicDataUrl = null;

// Load theme from localStorage
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
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

// Profile picture compression and preview (optional)
profilePicInput.addEventListener('change', () => {
  const file = profilePicInput.files[0];
  if (!file) {
    selectedProfilePicDataUrl = null;
    return;
  }
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file');
    profilePicInput.value = '';
    selectedProfilePicDataUrl = null;
    return;
  }

  // Compress image using canvas
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxWidth = 200;
      const scaleSize = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scaleSize;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      selectedProfilePicDataUrl = canvas.toDataURL('image/jpeg', 0.7); // compressed jpeg
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// On form submit
joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.textContent = '';

  const userName = joinForm.userName.value.trim();
  const roomId = joinForm.roomId.value.trim();
  const password = joinForm.password.value.trim();

  if (!userName || !roomId || !password) {
    formError.textContent = 'Please fill all required fields!';
    return;
  }

  // Save user data to sessionStorage for chat page
  sessionStorage.setItem('userName', userName);
  sessionStorage.setItem('roomId', roomId);
  sessionStorage.setItem('password', password);
  if (selectedProfilePicDataUrl) {
    sessionStorage.setItem('profilePic', selectedProfilePicDataUrl);
  } else {
    sessionStorage.removeItem('profilePic');
  }

  // Redirect to chat page
  window.location.href = 'chat.html';
});
