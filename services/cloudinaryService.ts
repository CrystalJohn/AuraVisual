/**
 * Cloudinary Upload Service
 * Uploads base64 images to Cloudinary via unsigned upload preset.
 * Returns the Cloudinary URL for persistent storage.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = 'aura-vi';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload a base64 image string to Cloudinary.
 * @param base64 - The raw base64 string (without data URI prefix) OR a full data URI
 * @param folder - Optional subfolder in Cloudinary (default: 'aura_visual')
 * @returns The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (
  base64: string, 
  folder: string = 'aura_visual'
): Promise<string> => {
  // Ensure we have a proper data URI
  const dataUri = base64.startsWith('data:') 
    ? base64 
    : `data:image/png;base64,${base64}`;

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed: ${errorData?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.secure_url;
};

/**
 * Upload multiple base64 images in parallel.
 * @param base64Images - Array of base64 strings
 * @param folder - Optional subfolder
 * @returns Array of Cloudinary URLs
 */
export const uploadMultipleToCloudinary = async (
  base64Images: string[], 
  folder: string = 'aura_visual'
): Promise<string[]> => {
  const results = await Promise.allSettled(
    base64Images.map(img => uploadToCloudinary(img, folder))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to upload image ${index}:`, result.reason);
      // Fallback to base64 if upload fails
      return base64Images[index];
    }
  });
};
