import db from './db'
import supabase from './supabase'

/**
 * Check if the app is online
 * @returns {boolean} - Online status
 */
export function isOnline() {
  return navigator.onLine
}

/**
 * Process all pending items in the sync queue
 * @returns {Promise<object>} - Sync result with success/error counts
 */
export async function processQueue() {
  const result = {
    synced: 0,
    failed: 0,
    errors: [],
  }

  if (!isOnline()) {
    result.errors.push('Device is offline')
    return result
  }

  try {
    // Get all pending items
    const queueItems = await db.sync_queue.toArray()

    for (const item of queueItems) {
      try {
        const { table, record_id, action } = item

        // Get the record from local storage
        const record = await db[table].get(record_id)

        if (action === 'create' || action === 'update') {
          // Upsert to Supabase
          const { error } = await supabase.from(table).upsert(
            {
              ...record,
              sync_status: 'synced',
            },
            { onConflict: 'id' }
          )

          if (error) throw error

          // Update local record status
          await db[table].update(record_id, { sync_status: 'synced' })

          // Remove from queue
          await db.sync_queue.delete(item.id)

          result.synced++
        } else if (action === 'delete') {
          // Delete from Supabase
          const { error } = await supabase.from(table).delete().eq('id', record_id)

          if (error) throw error

          // Remove from queue
          await db.sync_queue.delete(item.id)

          result.synced++
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          item: item.id,
          table: item.table,
          action: item.action,
          message: error.message,
        })
        console.error('Sync error for queue item:', item, error)
        // Don't remove from queue on error, will retry next time
      }
    }
  } catch (error) {
    result.errors.push('Failed to process queue: ' + error.message)
    console.error('Queue processing failed:', error)
  }

  return result
}

/**
 * Upload pending offline photos to Supabase Storage
 * @returns {Promise<object>} - Upload result with success/error counts
 */
export async function uploadPendingPhotos() {
  const result = {
    uploaded: 0,
    failed: 0,
    errors: [],
  }

  if (!isOnline()) {
    result.errors.push('Device is offline')
    return result
  }

  try {
    // Get all pending photos
    const pendingPhotos = await db.offline_photos.where('uploaded').equals(false).toArray()

    for (const photo of pendingPhotos) {
      try {
        const { record_id, field, data, id } = photo

        // Convert base64 to blob
        const binaryString = atob(data.split(',')[1])
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' })

        // Generate unique filename
        const filename = `photo_${record_id}_${field}_${Date.now()}.jpg`
        const path = `fairlog-photos/${filename}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('fairlog-photos')
          .upload(path, blob, { upsert: true })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('fairlog-photos')
          .getPublicUrl(path)

        // Update the original record with the URL
        const [table, recordId] = record_id.split('_')
        await db[table].update(recordId, {
          [field]: publicUrl.publicUrl,
          sync_status: 'pending',
        })

        // Mark photo as uploaded
        await db.offline_photos.update(id, { uploaded: true })

        result.uploaded++
      } catch (error) {
        result.failed++
        result.errors.push({
          photoId: photo.id,
          message: error.message,
        })
        console.error('Photo upload error:', photo, error)
      }
    }
  } catch (error) {
    result.errors.push('Failed to upload photos: ' + error.message)
    console.error('Photo upload failed:', error)
  }

  return result
}

/**
 * Run full sync: process queue then upload photos
 * @returns {Promise<object>} - Combined sync and upload results
 */
export async function syncAll() {
  const queueResult = await processQueue()
  const photoResult = await uploadPendingPhotos()

  return {
    queue: queueResult,
    photos: photoResult,
    success: queueResult.failed === 0 && photoResult.failed === 0,
  }
}

export default {
  isOnline,
  processQueue,
  uploadPendingPhotos,
  syncAll,
}
