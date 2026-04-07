/**
 * Compress an image file to a smaller size
 * @param {File} file - Image file to compress
 * @param {number} maxSize - Maximum dimension (width or height) in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} - Compressed image blob
 */
export async function compressImage(file, maxSize = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            resolve(blob)
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target.result
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Convert a file to base64 string for offline storage
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 encoded string
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Generate a storage path for a photo
 * @param {string|number} eventId - Event ID
 * @param {string|number} supplierId - Supplier ID
 * @param {string} filename - Original filename
 * @returns {string} - Storage path
 */
export function generatePhotoPath(eventId, supplierId, filename) {
  const timestamp = Date.now()
  const extension = filename.split('.').pop() || 'jpg'
  return `events/${eventId}/suppliers/${supplierId}/${timestamp}.${extension}`
}

export default {
  compressImage,
  fileToBase64,
  generatePhotoPath,
}
