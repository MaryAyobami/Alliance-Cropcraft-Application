const webpush = require('web-push')
require('dotenv').config()
const { pool } = require('./db')

// Configure web-push
webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Save subscription for a user
async function saveSubscription(userId, subscription) {
  await pool.query('UPDATE users SET push_subscription = $1 WHERE id = $2', [subscription, userId])
}

// Send push notification to a user
async function sendPushToUser(userId, payload) {
  const result = await pool.query('SELECT push_subscription FROM users WHERE id = $1', [userId])
  const subscription = result.rows[0]?.push_subscription
  if (subscription) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload))
      return true
    } catch (err) {
      console.error('Push error:', err)
      return false
    }
  }
  return false
}

module.exports = { saveSubscription, sendPushToUser }