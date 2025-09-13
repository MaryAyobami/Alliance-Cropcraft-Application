/**
 * Alliance CropCraft - Offline Sync Service
 * Handles offline data storage and synchronization using localStorage and IndexedDB
 * Implements offline queuing for API calls and data persistence
 */

// ============================================================================
// INDEXEDDB SETUP
// ============================================================================

const DB_NAME = 'AllianceCropCraftDB'
const DB_VERSION = 1
let db = null

// Initialize IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result

      // Create object stores for offline data
      if (!database.objectStoreNames.contains('livestock')) {
        const livestockStore = database.createObjectStore('livestock', { keyPath: 'id' })
        livestockStore.createIndex('species', 'species', { unique: false })
        livestockStore.createIndex('pen_id', 'pen_id', { unique: false })
        livestockStore.createIndex('health_status', 'health_status', { unique: false })
      }

      if (!database.objectStoreNames.contains('pens')) {
        const pensStore = database.createObjectStore('pens', { keyPath: 'id' })
        pensStore.createIndex('species', 'species', { unique: false })
      }

      if (!database.objectStoreNames.contains('users')) {
        const usersStore = database.createObjectStore('users', { keyPath: 'id' })
        usersStore.createIndex('role', 'role', { unique: false })
      }

      if (!database.objectStoreNames.contains('healthRecords')) {
        const healthStore = database.createObjectStore('healthRecords', { keyPath: 'id' })
        healthStore.createIndex('animal_id', 'animal_id', { unique: false })
        healthStore.createIndex('type', 'type', { unique: false })
      }

      if (!database.objectStoreNames.contains('weightRecords')) {
        const weightStore = database.createObjectStore('weightRecords', { keyPath: 'id' })
        weightStore.createIndex('animal_id', 'animal_id', { unique: false })
      }

      if (!database.objectStoreNames.contains('feedLogs')) {
        const feedStore = database.createObjectStore('feedLogs', { keyPath: 'id' })
        feedStore.createIndex('pen_id', 'pen_id', { unique: false })
        feedStore.createIndex('feed_date', 'feed_date', { unique: false })
      }

      if (!database.objectStoreNames.contains('pendingSync')) {
        const syncStore = database.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true })
        syncStore.createIndex('endpoint', 'endpoint', { unique: false })
        syncStore.createIndex('method', 'method', { unique: false })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }

      if (!database.objectStoreNames.contains('notifications')) {
        const notificationStore = database.createObjectStore('notifications', { keyPath: 'id' })
        notificationStore.createIndex('user_id', 'user_id', { unique: false })
        notificationStore.createIndex('due_date', 'due_date', { unique: false })
      }
    }
  })
}

// ============================================================================
// OFFLINE STORAGE UTILITIES
// ============================================================================

// Generic IndexedDB operations
export const dbOperations = {
  async get(storeName, key) {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async getAll(storeName, indexName = null, indexValue = null) {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      
      let request
      if (indexName && indexValue) {
        const index = store.index(indexName)
        request = index.getAll(indexValue)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async put(storeName, data) {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async delete(storeName, key) {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async clear(storeName) {
    await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// ============================================================================
// OFFLINE QUEUE MANAGEMENT
// ============================================================================

// Queue API calls for offline sync
export const queueAPICall = async (endpoint, method, data = null, priority = 'normal') => {
  const queueItem = {
    endpoint,
    method: method.toUpperCase(),
    data,
    priority, // 'high', 'normal', 'low'
    timestamp: Date.now(),
    retries: 0,
    maxRetries: 3
  }

  await dbOperations.put('pendingSync', queueItem)
  console.log(`[OfflineSync] Queued ${method} ${endpoint}`, queueItem)

  // Try to sync immediately if online
  if (navigator.onLine) {
    setTimeout(() => syncPendingCalls(), 1000)
  }

  return queueItem
}

// Process pending API calls
export const syncPendingCalls = async () => {
  if (!navigator.onLine) {
    console.log('[OfflineSync] Offline - skipping sync')
    return
  }

  const pendingCalls = await dbOperations.getAll('pendingSync')
  console.log(`[OfflineSync] Processing ${pendingCalls.length} pending calls`)

  // Sort by priority and timestamp
  const sortedCalls = pendingCalls.sort((a, b) => {
    const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return a.timestamp - b.timestamp
  })

  for (const call of sortedCalls) {
    try {
      await processPendingCall(call)
      await dbOperations.delete('pendingSync', call.id)
      console.log(`[OfflineSync] Successfully synced ${call.method} ${call.endpoint}`)
    } catch (error) {
      console.error(`[OfflineSync] Failed to sync ${call.method} ${call.endpoint}:`, error)
      
      // Update retry count
      call.retries += 1
      if (call.retries >= call.maxRetries) {
        console.error(`[OfflineSync] Max retries reached for ${call.method} ${call.endpoint}`)
        await dbOperations.delete('pendingSync', call.id)
        
        // Store failed calls for manual review
        await storeFailedSync(call, error)
      } else {
        await dbOperations.put('pendingSync', call)
      }
    }
  }
}

// Process individual pending call
const processPendingCall = async (call) => {
  const { default: api } = await import('./api.js')
  
  const config = {
    method: call.method,
    url: call.endpoint,
    ...(call.data && { data: call.data })
  }

  return api.request(config)
}

// Store failed sync attempts
const storeFailedSync = async (call, error) => {
  const failedCalls = JSON.parse(localStorage.getItem('failedSyncCalls') || '[]')
  failedCalls.push({
    ...call,
    error: error.message,
    failedAt: Date.now()
  })
  localStorage.setItem('failedSyncCalls', JSON.stringify(failedCalls))
}

// ============================================================================
// DATA CACHING UTILITIES
// ============================================================================

// Cache data locally for offline access
export const cacheData = {
  async livestock(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await dbOperations.put('livestock', { ...item, cached_at: Date.now() })
      }
    } else {
      await dbOperations.put('livestock', { ...data, cached_at: Date.now() })
    }
  },

  async pens(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await dbOperations.put('pens', { ...item, cached_at: Date.now() })
      }
    } else {
      await dbOperations.put('pens', { ...data, cached_at: Date.now() })
    }
  },

  async users(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await dbOperations.put('users', { ...item, cached_at: Date.now() })
      }
    } else {
      await dbOperations.put('users', { ...data, cached_at: Date.now() })
    }
  },

  async healthRecords(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await dbOperations.put('healthRecords', { ...item, cached_at: Date.now() })
      }
    } else {
      await dbOperations.put('healthRecords', { ...data, cached_at: Date.now() })
    }
  },

  async weightRecords(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await dbOperations.put('weightRecords', { ...item, cached_at: Date.now() })
      }
    } else {
      await dbOperations.put('weightRecords', { ...data, cached_at: Date.now() })
    }
  },

  async feedLogs(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        await dbOperations.put('feedLogs', { ...item, cached_at: Date.now() })
      }
    } else {
      await dbOperations.put('feedLogs', { ...data, cached_at: Date.now() })
    }
  }
}

// Retrieve cached data
export const getCachedData = {
  livestock: (id = null) => id ? dbOperations.get('livestock', id) : dbOperations.getAll('livestock'),
  pens: (id = null) => id ? dbOperations.get('pens', id) : dbOperations.getAll('pens'),
  users: (id = null) => id ? dbOperations.get('users', id) : dbOperations.getAll('users'),
  healthRecords: (animalId = null) => animalId ? dbOperations.getAll('healthRecords', 'animal_id', animalId) : dbOperations.getAll('healthRecords'),
  weightRecords: (animalId = null) => animalId ? dbOperations.getAll('weightRecords', 'animal_id', animalId) : dbOperations.getAll('weightRecords'),
  feedLogs: (penId = null) => penId ? dbOperations.getAll('feedLogs', 'pen_id', penId) : dbOperations.getAll('feedLogs'),
}

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

// Queue notifications for offline viewing
export const queueNotification = async (notification) => {
  const notificationWithId = {
    ...notification,
    id: `offline_${Date.now()}`,
    queued_at: Date.now(),
    synced: false
  }

  await dbOperations.put('notifications', notificationWithId)
  
  // Show browser notification if permission granted
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/logo.png',
      badge: '/logo.png'
    })
  }

  return notificationWithId
}

// Get offline notifications
export const getOfflineNotifications = async (userId = null) => {
  if (userId) {
    return dbOperations.getAll('notifications', 'user_id', userId)
  }
  return dbOperations.getAll('notifications')
}

// ============================================================================
// AUTO-BACKUP UTILITIES
// ============================================================================

// Export all data to JSON for backup
export const exportDataBackup = async () => {
  const backup = {
    timestamp: Date.now(),
    version: '1.0',
    data: {
      livestock: await getCachedData.livestock(),
      pens: await getCachedData.pens(),
      users: await getCachedData.users(),
      healthRecords: await getCachedData.healthRecords(),
      weightRecords: await getCachedData.weightRecords(),
      feedLogs: await getCachedData.feedLogs(),
      notifications: await dbOperations.getAll('notifications')
    }
  }

  // Store in localStorage as well
  localStorage.setItem('allianceCropCraftBackup', JSON.stringify(backup))
  
  // Create downloadable backup file
  const dataStr = JSON.stringify(backup, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
  
  const exportFileDefaultName = `alliance-cropcraft-backup-${new Date().toISOString().split('T')[0]}.json`
  
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()

  console.log('[OfflineSync] Data backup exported')
  return backup
}

// ============================================================================
// SYNC STATUS AND MONITORING
// ============================================================================

// Get sync status
export const getSyncStatus = async () => {
  const pendingCalls = await dbOperations.getAll('pendingSync')
  const failedCalls = JSON.parse(localStorage.getItem('failedSyncCalls') || '[]')
  
  return {
    isOnline: navigator.onLine,
    pendingSync: pendingCalls.length,
    failedSync: failedCalls.length,
    lastSync: localStorage.getItem('lastSyncTime'),
    dbInitialized: !!db
  }
}

// Manual sync trigger
export const forcSync = async () => {
  console.log('[OfflineSync] Manual sync triggered')
  await syncPendingCalls()
  localStorage.setItem('lastSyncTime', Date.now().toString())
}

// ============================================================================
// INITIALIZATION AND EVENT LISTENERS
// ============================================================================

// Initialize offline sync system
export const initOfflineSync = async () => {
  try {
    await initDB()
    console.log('[OfflineSync] IndexedDB initialized')

    // Set up online/offline event listeners
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Back online - starting sync')
      syncPendingCalls()
    })

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Gone offline - queuing mode activated')
    })

    // Periodic sync when online (every 5 minutes)
    setInterval(() => {
      if (navigator.onLine) {
        syncPendingCalls()
      }
    }, 5 * 60 * 1000)

    // Auto-backup daily (stored in localStorage)
    const lastBackup = localStorage.getItem('lastAutoBackup')
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    
    if (!lastBackup || parseInt(lastBackup) < oneDayAgo) {
      await exportDataBackup()
      localStorage.setItem('lastAutoBackup', Date.now().toString())
    }

    console.log('[OfflineSync] System initialized successfully')
    return true
  } catch (error) {
    console.error('[OfflineSync] Initialization failed:', error)
    return false
  }
}

// ============================================================================
// EXPORT MAIN FUNCTIONS
// ============================================================================

export default {
  initOfflineSync,
  queueAPICall,
  syncPendingCalls,
  cacheData,
  getCachedData,
  queueNotification,
  getOfflineNotifications,
  exportDataBackup,
  getSyncStatus,
  forcSync
}