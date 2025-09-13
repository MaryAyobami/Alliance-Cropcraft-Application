const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// NOTIFICATIONS ROUTES
// ============================================================================

// Get notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, unread_only, page = 1, limit = 50 } = req.query;
    const requestingUserId = req.user.userId;
    const userRole = req.user.role;
    const offset = (page - 1) * limit;

    // Determine which user's notifications to fetch
    let targetUserId = requestingUserId;
    
    if (user_id && ['Admin', 'Farm Manager', 'Supervisor'].includes(userRole)) {
      targetUserId = user_id;
    }

    let queryText = `
      SELECT 
        n.*,
        l.name as animal_name,
        l.tag as animal_tag,
        p.name as pen_name
      FROM notifications n
      LEFT JOIN livestock l ON n.related_animal_id = l.id
      LEFT JOIN pens p ON n.related_pen_id = p.id
      WHERE n.user_id = $1
    `;

    let params = [targetUserId];

    if (unread_only === 'true') {
      queryText += ' AND n.is_read = false';
    }

    queryText += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRetry(queryText, params);

    // Get unread count
    const unreadResult = await queryWithRetry(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
      [targetUserId]
    );

    res.json({
      success: true,
      data: result.rows,
      unread_count: parseInt(unreadResult.rows[0].unread_count)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.put('/:id/read',
  authenticateToken,
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await queryWithRetry(`
        UPDATE notifications 
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [id, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification'
      });
    }
  }
);

// Create notification
router.post('/',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  async (req, res) => {
    try {
      const { user_id, type, title, message, due_date, priority, related_animal_id, related_pen_id } = req.body;

      // Verify target user exists
      const userCheck = await queryWithRetry('SELECT id FROM users WHERE id = $1', [user_id]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO notifications (user_id, type, title, message, due_date, priority, related_animal_id, related_pen_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *
      `, [user_id, type, title, message, due_date, priority, related_animal_id, related_pen_id]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Notification created successfully'
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create notification'
      });
    }
  }
);

// Delete notification
router.delete('/:id',
  authenticateToken,
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Users can only delete their own notifications, unless they're admin/manager
      let queryText = 'DELETE FROM notifications WHERE id = $1';
      let params = [id];

      if (!['Admin', 'Farm Manager'].includes(userRole)) {
        queryText += ' AND user_id = $2';
        params.push(userId);
      }

      queryText += ' RETURNING *';

      const result = await queryWithRetry(queryText, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }
);

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await queryWithRetry(`
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
        COUNT(CASE WHEN priority = 'urgent' AND is_read = false THEN 1 END) as urgent_unread,
        COUNT(CASE WHEN due_date <= CURRENT_DATE AND is_read = false THEN 1 END) as overdue_notifications
      FROM notifications 
      WHERE user_id = $1
    `, [userId]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await queryWithRetry(
      'UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false RETURNING COUNT(*)',
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
});

module.exports = router;