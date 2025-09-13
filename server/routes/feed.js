const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateFeedRation, validateFeedLog, validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// FEED MANAGEMENT ROUTES
// ============================================================================

// Get feed rations
router.get('/rations', authenticateToken, async (req, res) => {
  try {
    const { pen_id, active_only } = req.query;

    let queryText = `
      SELECT 
        fr.*,
        p.name as pen_name,
        p.species as pen_species,
        p.current_occupancy,
        u.full_name as created_by_name
      FROM feed_rations fr
      JOIN pens p ON fr.pen_id = p.id
      LEFT JOIN users u ON fr.created_by = u.id
    `;

    let params = [];
    let conditions = [];

    if (pen_id) {
      conditions.push(`fr.pen_id = $${params.length + 1}`);
      params.push(pen_id);
    }

    if (active_only === 'true') {
      conditions.push(`fr.effective_from <= CURRENT_DATE`);
      conditions.push(`(fr.effective_until IS NULL OR fr.effective_until >= CURRENT_DATE)`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ' ORDER BY fr.effective_from DESC';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching feed rations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed rations'
    });
  }
});

// Create feed ration
router.post('/rations',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  validateFeedRation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pen_id, ration_name, composition, feeding_times, cost_per_day, effective_from, effective_until, notes } = req.body;
      const created_by = req.user.userId;

      // Verify pen exists
      const penCheck = await queryWithRetry('SELECT id, name FROM pens WHERE id = $1', [pen_id]);
      if (penCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pen not found'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO feed_rations (pen_id, ration_name, composition, feeding_times, cost_per_day, effective_from, effective_until, created_by, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `, [pen_id, ration_name, JSON.stringify(composition), feeding_times, cost_per_day, effective_from, effective_until, created_by, notes]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Feed ration created successfully'
      });
    } catch (error) {
      console.error('Error creating feed ration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create feed ration'
      });
    }
  }
);

// Update feed ration
router.put('/rations/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  validateId,
  validateFeedRation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { ration_name, composition, feeding_times, cost_per_day, effective_from, effective_until, notes } = req.body;

      const result = await queryWithRetry(`
        UPDATE feed_rations 
        SET ration_name = $1, composition = $2, feeding_times = $3, cost_per_day = $4, 
            effective_from = $5, effective_until = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `, [ration_name, JSON.stringify(composition), feeding_times, cost_per_day, effective_from, effective_until, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Feed ration not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Feed ration updated successfully'
      });
    } catch (error) {
      console.error('Error updating feed ration:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update feed ration'
      });
    }
  }
);

// Get feed inventory
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const { item_type, low_stock } = req.query;

    let queryText = `
      SELECT *
      FROM feed_inventory
    `;

    let params = [];
    let conditions = [];

    if (item_type) {
      conditions.push(`item_type = $${params.length + 1}`);
      params.push(item_type);
    }

    if (low_stock === 'true') {
      conditions.push(`current_stock < 50`); // Arbitrary threshold for low stock
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ' ORDER BY item_name';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching feed inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed inventory'
    });
  }
});

// Update feed inventory
router.put('/inventory/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Feed Production Officer']),
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { current_stock, cost_per_unit, supplier, notes } = req.body;

      const result = await queryWithRetry(`
        UPDATE feed_inventory 
        SET current_stock = $1, cost_per_unit = $2, supplier = $3, notes = $4, last_updated = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [current_stock, cost_per_unit, supplier, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Inventory updated successfully'
      });
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory'
      });
    }
  }
);

// Get feed logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { pen_id, date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        fl.*,
        p.name as pen_name,
        p.species as pen_species,
        u_fed.full_name as fed_by_name,
        u_approved.full_name as approved_by_name
      FROM feed_logs fl
      JOIN pens p ON fl.pen_id = p.id
      LEFT JOIN users u_fed ON fl.fed_by = u_fed.id
      LEFT JOIN users u_approved ON fl.approved_by = u_approved.id
    `;

    let params = [];
    let conditions = [];

    if (pen_id) {
      conditions.push(`fl.pen_id = $${params.length + 1}`);
      params.push(pen_id);
    }

    if (date) {
      conditions.push(`fl.feed_date = $${params.length + 1}`);
      params.push(date);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY fl.feed_date DESC, fl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching feed logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed logs'
    });
  }
});

// Create feed log
router.post('/logs',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Farm Attendant', 'Supervisor']),
  validateFeedLog,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pen_id, feed_date, morning_fed, afternoon_fed, evening_fed, total_amount_kg, notes } = req.body;
      const fed_by = req.user.userId;

      // Verify pen exists
      const penCheck = await queryWithRetry('SELECT id, name FROM pens WHERE id = $1', [pen_id]);
      if (penCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pen not found'
        });
      }

      // Check if log already exists for this pen and date
      const existingLog = await queryWithRetry(
        'SELECT id FROM feed_logs WHERE pen_id = $1 AND feed_date = $2',
        [pen_id, feed_date]
      );

      if (existingLog.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Feed log already exists for this pen and date'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO feed_logs (pen_id, feed_date, morning_fed, afternoon_fed, evening_fed, total_amount_kg, fed_by, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *
      `, [pen_id, feed_date, morning_fed, afternoon_fed, evening_fed, total_amount_kg, fed_by, notes]);

      // Get complete record
      const completeRecord = await queryWithRetry(`
        SELECT 
          fl.*,
          p.name as pen_name,
          u.full_name as fed_by_name
        FROM feed_logs fl
        JOIN pens p ON fl.pen_id = p.id
        LEFT JOIN users u ON fl.fed_by = u.id
        WHERE fl.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Feed log created successfully'
      });
    } catch (error) {
      console.error('Error creating feed log:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create feed log'
      });
    }
  }
);

// Update feed log (for approval by supervisor)
router.put('/logs/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { morning_fed, afternoon_fed, evening_fed, total_amount_kg, notes } = req.body;
      const approved_by = req.user.userId;

      const result = await queryWithRetry(`
        UPDATE feed_logs 
        SET morning_fed = $1, afternoon_fed = $2, evening_fed = $3, total_amount_kg = $4, 
            notes = $5, approved_by = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [morning_fed, afternoon_fed, evening_fed, total_amount_kg, notes, approved_by, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Feed log not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Feed log updated successfully'
      });
    } catch (error) {
      console.error('Error updating feed log:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update feed log'
      });
    }
  }
);

// Get daily feed requirements
router.get('/requirements', authenticateToken, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const result = await queryWithRetry(`
      SELECT 
        p.id as pen_id,
        p.name as pen_name,
        p.species,
        p.current_occupancy,
        fr.ration_name,
        fr.composition,
        fr.cost_per_day,
        fr.feeding_times,
        CASE 
          WHEN fl.morning_fed THEN 'Fed' 
          ELSE 'Pending' 
        END as morning_status,
        CASE 
          WHEN fl.afternoon_fed THEN 'Fed' 
          ELSE 'Pending' 
        END as afternoon_status,
        CASE 
          WHEN fl.evening_fed THEN 'Fed' 
          ELSE 'Pending' 
        END as evening_status,
        fl.total_amount_kg as amount_fed,
        fl.notes as feeding_notes
      FROM pens p
      LEFT JOIN feed_rations fr ON p.id = fr.pen_id 
        AND fr.effective_from <= $1 
        AND (fr.effective_until IS NULL OR fr.effective_until >= $1)
      LEFT JOIN feed_logs fl ON p.id = fl.pen_id AND fl.feed_date = $1
      WHERE p.current_occupancy > 0
      ORDER BY p.name
    `, [date]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching feed requirements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed requirements'
    });
  }
});

// Get feed efficiency report
router.get('/efficiency', authenticateToken, async (req, res) => {
  try {
    const { pen_id, from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    let queryText = `
      SELECT 
        p.id as pen_id,
        p.name as pen_name,
        p.species,
        AVG(p.current_occupancy) as avg_occupancy,
        SUM(fl.total_amount_kg) as total_feed_consumed,
        AVG(fl.total_amount_kg) as avg_daily_feed,
        SUM(fr.cost_per_day) as total_feed_cost,
        COUNT(DISTINCT fl.feed_date) as feeding_days,
        ROUND(
          SUM(fl.total_amount_kg) / NULLIF(AVG(p.current_occupancy), 0), 2
        ) as feed_per_animal_kg
      FROM pens p
      LEFT JOIN feed_logs fl ON p.id = fl.pen_id 
        AND fl.feed_date BETWEEN $1 AND $2
      LEFT JOIN feed_rations fr ON p.id = fr.pen_id 
        AND fr.effective_from <= fl.feed_date
        AND (fr.effective_until IS NULL OR fr.effective_until >= fl.feed_date)
    `;

    let params = [fromDate, toDate];

    if (pen_id) {
      queryText += ' AND p.id = $3';
      params.push(pen_id);
    }

    queryText += ' GROUP BY p.id, p.name, p.species ORDER BY p.name';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching feed efficiency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed efficiency report'
    });
  }
});

// Get pending feed approvals (for supervisors)
router.get('/pending-approvals', 
  authenticateToken, 
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  async (req, res) => {
    try {
      const result = await queryWithRetry(`
        SELECT 
          fl.*,
          p.name as pen_name,
          p.species as pen_species,
          u.full_name as fed_by_name
        FROM feed_logs fl
        JOIN pens p ON fl.pen_id = p.id
        LEFT JOIN users u ON fl.fed_by = u.id
        WHERE fl.approved_by IS NULL
        ORDER BY fl.feed_date DESC, fl.created_at DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending approvals'
      });
    }
  }
);

module.exports = router;