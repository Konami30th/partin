const joinForm = document.getElementById('joinForm');

joinForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const roomId = document.getElementById('roomId').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const profilePicInput = document.getElementById('profilePic');

  if (!roomId || !username || !password) {
    alert('لطفاً همه فیلدها را پر کنید');
    return;
  }

  let profilePicDataUrl = null;

  if (profilePicInput.files.length > 0) {
    const file = profilePicInput.files[0];

    try {
      profilePicDataUrl = await compressImage(file, 100, 100, 0.7);
    } catch (err) {
      alert('خطا در فشرده‌سازی تصویر پروفایل');
      return;
    }
  }

  if (profilePicDataUrl) {
    localStorage.setItem('profilePicDataUrl', profilePicDataUrl);
  } else {
    localStorage.removeItem('profilePicDataUrl');
  }

  const params = new URLSearchParams({
    roomId,
    username,
    password
  });

  window.location.href = `room.html?${params.toString()}`;
});

function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedReader = new FileReader();
            compressedReader.readAsDataURL(blob);
            compressedReader.onload = () => {
              resolve(compressedReader.result);
            };
            compressedReader.onerror = () => {
              reject(new Error('خطا در تبدیل blob به base64'));
            };
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('خطا در بارگذاری تصویر'));
    };

    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
  });
}
