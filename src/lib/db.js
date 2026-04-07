import Dexie from 'dexie'

export const db = new Dexie('fairlog-offline')

db.version(1).stores({
  events: 'id, name, created_by, sync_status',
  event_members: 'id, event_id, user_id, sync_status',
  suppliers: 'id, event_id, name, category, rating, sync_status',
  products: 'id, supplier_id, event_id, name, category, rating, is_shortlisted, shortlist_status, sync_status',
  product_comments: 'id, product_id, user_id, sync_status',
  shortlist: 'id, product_id, user_id, event_id, status, sync_status',
  event_tags: 'id, event_id, sync_status',
  sync_queue: '++id, table, record_id, action, created_at',
  offline_photos: '++id, record_id, field, data, uploaded',
})

/**
 * Save a new record locally with pending sync status
 * @param {string} table - Table name
 * @param {object} record - Record to save
 * @returns {Promise} - Added record
 */
export async function saveLocally(table, record) {
  const recordWithSync = {
    ...record,
    sync_status: 'pending',
  }

  const id = await db[table].add(recordWithSync)

  // Add to sync queue
  await db.sync_queue.add({
    table,
    record_id: id,
    action: 'create',
    created_at: new Date().toISOString(),
  })

  return { ...recordWithSync, id }
}

/**
 * Update a record locally and queue for sync
 * @param {string} table - Table name
 * @param {number|string} id - Record ID
 * @param {object} changes - Changes to apply
 * @returns {Promise} - Updated record
 */
export async function updateLocally(table, id, changes) {
  const updated = await db[table].update(id, {
    ...changes,
    sync_status: 'pending',
  })

  if (updated) {
    // Add to sync queue
    await db.sync_queue.add({
      table,
      record_id: id,
      action: 'update',
      created_at: new Date().toISOString(),
    })
  }

  return updated
}

/**
 * Delete a record locally and queue for sync
 * @param {string} table - Table name
 * @param {number|string} id - Record ID
 * @returns {Promise} - Deleted count
 */
export async function deleteLocally(table, id) {
  await db[table].delete(id)

  // Add to sync queue
  await db.sync_queue.add({
    table,
    record_id: id,
    action: 'delete',
    created_at: new Date().toISOString(),
  })

  return 1
}

/**
 * Get count of pending sync items
 * @returns {Promise<number>} - Count of pending items
 */
export async function getPendingCount() {
  return await db.sync_queue.where('table').notEqual('').count()
}

export default db
