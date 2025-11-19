/**
 * Utility functions for image handling and encoding
 */

export interface ImageData {
  base64: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Converts a File object to base64 string
 * @param file - The file to convert
 * @param maxSizeKB - Maximum file size in KB (default: 1024KB = 1MB)
 * @returns Promise<ImageData> - Object containing base64 data and metadata
 */
export async function fileToBase64(
  file: File, 
  maxSizeKB: number = 1024
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Check file size
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB > maxSizeKB) {
      reject(new Error(`File size (${fileSizeKB.toFixed(1)}KB) exceeds maximum allowed size (${maxSizeKB}KB)`));
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64: result,
        name: file.name,
        size: file.size,
        type: file.type
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Converts multiple files to base64 strings
 * @param files - Array of files to convert
 * @param maxSizeKB - Maximum file size in KB per file
 * @returns Promise<ImageData[]> - Array of base64 data objects
 */
export async function filesToBase64(
  files: File[], 
  maxSizeKB: number = 1024
): Promise<ImageData[]> {
  const promises = files.map(file => fileToBase64(file, maxSizeKB));
  return Promise.all(promises);
}

/**
 * Converts a base64 string to a File object
 * @param base64 - Base64 string
 * @param filename - Name for the file
 * @param mimeType - MIME type for the file
 * @returns File object
 */
export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}

/**
 * Compresses a base64 image by reducing quality
 * @param base64 - Base64 string of the image
 * @param quality - Quality from 0 to 1 (default: 0.8)
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1080)
 * @returns Promise<string> - Compressed base64 string
 */
export async function compressBase64Image(
  base64: string,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = base64;
  });
}

/**
 * Gets file size in human readable format
 * @param bytes - File size in bytes
 * @returns string - Formatted file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validates if a file is a valid image
 * @param file - File to validate
 * @returns boolean - True if valid image
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Gets image dimensions from base64 string
 * @param base64 - Base64 string of the image
 * @returns Promise<{width: number, height: number}> - Image dimensions
 */
export async function getImageDimensions(base64: string): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = base64;
  });
}
