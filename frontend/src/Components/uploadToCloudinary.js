// src/utils/uploadToCloudinary.js
export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'CMateApplication'); // Set in Cloudinary settings

  const response = await fetch('https://api.cloudinary.com/v1_1/duhqwj0o6/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Cloudinary upload failed');

  const data = await response.json();
  return data.secure_url; // This is the file URL
};
