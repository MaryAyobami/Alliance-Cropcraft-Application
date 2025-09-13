const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateWeightRecord, validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// WEIGHT TRACKING ROUTES
// ============================================================================

// Get weight records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { animal_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        wr.*,
        l.name as animal_name,
        l.species as animal_species,
        l.tag as animal_tag,
        u.full_name as recorded_by_name
      FROM weight_records wr
      JOIN livestock l ON wr.animal_id = l.id
      LEFT JOIN users u ON wr.recorded_by = u.id
    `;
    
    let params = [];
    let paramIndex = 1;

    if (animal_id) {
      queryText += ` WHERE wr.animal_id = $${paramIndex}`;
      params.push(animal_id);
      paramIndex++;
    }

    queryText += ` ORDER BY wr.date_recorded DESC, wr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await queryWithRetry(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM weight_records wr';
    let countParams = [];

    if (animal_id) {
      countQuery += ' WHERE wr.animal_id = $1';
      countParams.push(animal_id);
    }

    const countResult = await queryWithRetry(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching weight records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weight records'
    });
  }
});

// Get weight history for specific animal
router.get('/animal/:animalId', authenticateToken, async (req, res) => {
  try {
    const { animalId } = req.params;

    const result = await queryWithRetry(`
      SELECT 
        wr.*,
        u.full_name as recorded_by_name,
        LAG(wr.weight_kg) OVER (ORDER BY wr.date_recorded) as previous_weight
      FROM weight_records wr
      LEFT JOIN users u ON wr.recorded_by = u.id
      WHERE wr.animal_id = $1
      ORDER BY wr.date_recorded ASC
    `, [animalId]);

    // Calculate weight changes
    const recordsWithChanges = result.rows.map((record, index) => {
      if (index === 0 || !record.previous_weight) {
        return { ...record, weight_change: null, weight_change_percentage: null };
      }

      const change = record.weight_kg - record.previous_weight;
      const changePercentage = ((change / record.previous_weight) * 100).toFixed(1);

      return {
        ...record,
        weight_change: parseFloat(change.toFixed(1)),
        weight_change_percentage: parseFloat(changePercentage)
      };
    });

    res.json({
      success: true,
      data: recordsWithChanges
    });
  } catch (error) {
    console.error('Error fetching animal weight history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weight history'
    });
  }
});

// Create weight record
router.post('/',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor', 'Farm Attendant']),
  validateWeightRecord,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { animal_id, weight_kg, date_recorded, body_condition_score, notes } = req.body;
      const recorded_by = req.user.userId;

      // Verify animal exists
      const animalCheck = await queryWithRetry(
        'SELECT id, name, species FROM livestock WHERE id = $1 AND status = \'active\'',
        [animal_id]
      );

      if (animalCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Animal not found or inactive'
        });
      }

      // Check for duplicate weight record on same date
      const duplicateCheck = await queryWithRetry(
        'SELECT id FROM weight_records WHERE animal_id = $1 AND date_recorded = $2',
        [animal_id, date_recorded]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Weight record already exists for this date'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO weight_records (animal_id, weight_kg, date_recorded, body_condition_score, notes, recorded_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `, [animal_id, weight_kg, date_recorded, body_condition_score, notes, recorded_by]);

      // Get the complete record with animal details
      const completeRecord = await queryWithRetry(`
        SELECT 
          wr.*,
          l.name as animal_name,
          l.species as animal_species,
          u.full_name as recorded_by_name
        FROM weight_records wr
        JOIN livestock l ON wr.animal_id = l.id
        LEFT JOIN users u ON wr.recorded_by = u.id
        WHERE wr.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Weight record created successfully'
      });
    } catch (error) {
      console.error('Error creating weight record:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create weight record'
      });
    }
  }
);

// Update weight record
router.put('/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validateId,
  validateWeightRecord,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { weight_kg, date_recorded, body_condition_score, notes } = req.body;

      const result = await queryWithRetry(`
        UPDATE weight_records 
        SET weight_kg = $1, date_recorded = $2, body_condition_score = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [weight_kg, date_recorded, body_condition_score, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Weight record not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Weight record updated successfully'
      });
    } catch (error) {
      console.error('Error updating weight record:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update weight record'
      });
    }
  }
);

// Delete weight record
router.delete('/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await queryWithRetry('DELETE FROM weight_records WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Weight record not found'
        });
      }

      res.json({
        success: true,
        message: 'Weight record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting weight record:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete weight record'
      });
    }
  }
);

// Get weight trends for dashboard
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { species, days = 30 } = req.query;

    let queryText = `
      SELECT 
        l.species,
        DATE_TRUNC('week', wr.date_recorded) as week,
        AVG(wr.weight_kg) as avg_weight,
        COUNT(*) as record_count
      FROM weight_records wr
      JOIN livestock l ON wr.animal_id = l.id
      WHERE wr.date_recorded >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
    `;

    let params = [];
    if (species) {
      queryText += ' AND l.species = $1';
      params.push(species);
    }

    queryText += `
      GROUP BY l.species, DATE_TRUNC('week', wr.date_recorded)
      ORDER BY week DESC, l.species
    `;

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching weight trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weight trends'
    });
  }
});

// Get animals needing weight checks
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(`
      SELECT 
        l.id,
        l.name,
        l.species,
        l.tag,
        p.name as pen_name,
        COALESCE(MAX(wr.date_recorded), l.created_at::date) as last_weighed,
        CURRENT_DATE - COALESCE(MAX(wr.date_recorded), l.created_at::date) as days_since_weigh
      FROM livestock l
      LEFT JOIN weight_records wr ON l.id = wr.animal_id
      LEFT JOIN pens p ON l.pen_id = p.id
      WHERE l.status = 'active'
      GROUP BY l.id, l.name, l.species, l.tag, l.created_at, p.name
      HAVING CURRENT_DATE - COALESCE(MAX(wr.date_recorded), l.created_at::date) > 30
      ORDER BY days_since_weigh DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching weight alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weight alerts'
    });
  }
});

module.exports = router;