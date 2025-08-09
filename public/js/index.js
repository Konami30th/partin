const form = document.getElementById('login-form');
const profilePicInput = document.getElementById('profilePic');
const previewImg = document.getElementById('profilePreview');
const previewContainer = document.getElementById('preview-container');
const errorMsg = document.getElementById('error-msg');

let compressedProfilePicBase64 = null;

profilePicInput.addEventListener('change', () => {
  const file = profilePicInput.files[0];
  if (!file) {
    previewImg.style.display = 'none';
    compressedProfilePicBase64 = null;
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const maxSize = 100; // max width or height
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = height * (maxSize / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = width * (maxSize / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      compressedProfilePicBase64 = canvas.toDataURL('image/jpeg', 0.7);
      previewImg.src = compressedProfilePicBase64;
      previewImg.style.display = 'inline-block';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  errorMsg.innerText = '';

  const userName = document.getElementById('username').value.trim();
  const roomId = document.getElementById('roomId').value.trim();
  const password = document.getElementById('password').value;

  if (!userName || !roomId || !password) {
    errorMsg.innerText = 'Please fill all required fields.';
    return;
  }

  // Store profile pic in localStorage for room page
  if (compressedProfilePicBase64) {
    localStorage.setItem('profilePic', compressedProfilePicBase64);
  } else {
    localStorage.removeItem('profilePic');
  }

  localStorage.setItem('userName', userName);
  localStorage.setItem('roomId', roomId);
  localStorage.setItem('password', password);

  // Redirect to room page with params
  window.location.href = `room.html?roomId=${encodeURIComponent(roomId)}&password=${encodeURIComponent(password)}`;
});
