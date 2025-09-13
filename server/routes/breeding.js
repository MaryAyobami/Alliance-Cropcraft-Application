const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBreedingEvent, validatePregnancyCheck, validateBirth, validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// BREEDING MANAGEMENT ROUTES
// ============================================================================

// Get all breeding events
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    const result = await queryWithRetry(`
      SELECT 
        be.*,
        l_female.name as female_name,
        l_female.tag as female_tag,
        l_male.name as male_name,
        l_male.tag as male_tag,
        u.full_name as recorded_by_name,
        pc.result as pregnancy_result,
        pc.check_date as pregnancy_check_date,
        b.birth_date,
        b.offspring_count
      FROM breeding_events be
      JOIN livestock l_female ON be.female_id = l_female.id
      JOIN livestock l_male ON be.male_id = l_male.id
      LEFT JOIN users u ON be.recorded_by = u.id
      LEFT JOIN pregnancy_checks pc ON be.id = pc.breeding_event_id
      LEFT JOIN births b ON be.id = b.breeding_event_id
      ORDER BY be.service_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await queryWithRetry('SELECT COUNT(*) as total FROM breeding_events');
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
    console.error('Error fetching breeding events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breeding events'
    });
  }
});

// Create breeding event
router.post('/events',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validateBreedingEvent,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { female_id, male_id, breeding_method, service_date, notes } = req.body;
      const recorded_by = req.user.userId;

      // Verify animals exist and are of correct gender
      const animalCheck = await queryWithRetry(`
        SELECT 
          id, name, species, gender, health_status
        FROM livestock 
        WHERE id IN ($1, $2) AND status = 'active'
      `, [female_id, male_id]);

      if (animalCheck.rows.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'One or both animals not found or inactive'
        });
      }

      const female = animalCheck.rows.find(a => a.id == female_id);
      const male = animalCheck.rows.find(a => a.id == male_id);

      if (!female || !male) {
        return res.status(400).json({
          success: false,
          message: 'Invalid animal IDs provided'
        });
      }

      if (female.gender !== 'female' || male.gender !== 'male') {
        return res.status(400).json({
          success: false,
          message: 'Invalid gender combination for breeding'
        });
      }

      if (female.species !== male.species) {
        return res.status(400).json({
          success: false,
          message: 'Animals must be of the same species'
        });
      }

      // Calculate expected due date based on species
      const gestationPeriods = {
        cattle: 280,
        goat: 150,
        sheep: 147,
        pig: 114
      };
      
      const gestationDays = gestationPeriods[female.species] || 150;
      const serviceDateTime = new Date(service_date);
      const expectedDueDate = new Date(serviceDateTime.getTime() + (gestationDays * 24 * 60 * 60 * 1000));

      const result = await queryWithRetry(`
        INSERT INTO breeding_events (female_id, male_id, breeding_method, service_date, expected_due_date, recorded_by, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *
      `, [female_id, male_id, breeding_method, service_date, expectedDueDate.toISOString().split('T')[0], recorded_by, notes]);

      // Get complete record with animal details
      const completeRecord = await queryWithRetry(`
        SELECT 
          be.*,
          l_female.name as female_name,
          l_male.name as male_name,
          u.full_name as recorded_by_name
        FROM breeding_events be
        JOIN livestock l_female ON be.female_id = l_female.id
        JOIN livestock l_male ON be.male_id = l_male.id
        LEFT JOIN users u ON be.recorded_by = u.id
        WHERE be.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Breeding event recorded successfully'
      });
    } catch (error) {
      console.error('Error creating breeding event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create breeding event'
      });
    }
  }
);

// Get pregnancy checks
router.get('/pregnancy-checks', authenticateToken, async (req, res) => {
  try {
    const { breeding_event_id, female_id } = req.query;

    let queryText = `
      SELECT 
        pc.*,
        be.service_date,
        l.name as female_name,
        l.tag as female_tag,
        u.full_name as checked_by_name
      FROM pregnancy_checks pc
      JOIN breeding_events be ON pc.breeding_event_id = be.id
      JOIN livestock l ON pc.female_id = l.id
      LEFT JOIN users u ON pc.checked_by = u.id
    `;

    let params = [];
    let conditions = [];

    if (breeding_event_id) {
      conditions.push(`pc.breeding_event_id = $${params.length + 1}`);
      params.push(breeding_event_id);
    }

    if (female_id) {
      conditions.push(`pc.female_id = $${params.length + 1}`);
      params.push(female_id);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ' ORDER BY pc.check_date DESC';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pregnancy checks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pregnancy checks'
    });
  }
});

// Create pregnancy check
router.post('/pregnancy-checks',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validatePregnancyCheck,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { breeding_event_id, female_id, check_date, result: checkResult, method, notes } = req.body;
      const checked_by = req.user.userId;

      // Verify breeding event exists
      const eventCheck = await queryWithRetry(
        'SELECT id, female_id FROM breeding_events WHERE id = $1',
        [breeding_event_id]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Breeding event not found'
        });
      }

      if (eventCheck.rows[0].female_id != female_id) {
        return res.status(400).json({
          success: false,
          message: 'Female ID does not match breeding event'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO pregnancy_checks (breeding_event_id, female_id, check_date, result, method, checked_by, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *
      `, [breeding_event_id, female_id, check_date, checkResult, method, checked_by, notes]);

      // Get complete record
      const completeRecord = await queryWithRetry(`
        SELECT 
          pc.*,
          l.name as female_name,
          u.full_name as checked_by_name
        FROM pregnancy_checks pc
        JOIN livestock l ON pc.female_id = l.id
        LEFT JOIN users u ON pc.checked_by = u.id
        WHERE pc.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Pregnancy check recorded successfully'
      });
    } catch (error) {
      console.error('Error creating pregnancy check:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pregnancy check'
      });
    }
  }
);

// Get births
router.get('/births', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await queryWithRetry(`
      SELECT 
        b.*,
        l_dam.name as dam_name,
        l_dam.tag as dam_tag,
        l_sire.name as sire_name,
        l_sire.tag as sire_tag,
        u.full_name as assisted_by_name,
        be.service_date
      FROM births b
      JOIN livestock l_dam ON b.dam_id = l_dam.id
      JOIN livestock l_sire ON b.sire_id = l_sire.id
      LEFT JOIN users u ON b.assisted_by = u.id
      LEFT JOIN breeding_events be ON b.breeding_event_id = be.id
      ORDER BY b.birth_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching births:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch births'
    });
  }
});

// Create birth record
router.post('/births',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validateBirth,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { breeding_event_id, dam_id, sire_id, birth_date, birth_weight, offspring_count, complications, notes } = req.body;
      const assisted_by = req.user.userId;

      // Verify parents exist
      const parentsCheck = await queryWithRetry(`
        SELECT id, name, species, gender
        FROM livestock 
        WHERE id IN ($1, $2) AND status = 'active'
      `, [dam_id, sire_id]);

      if (parentsCheck.rows.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'One or both parent animals not found'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO births (breeding_event_id, dam_id, sire_id, birth_date, birth_weight, offspring_count, complications, assisted_by, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `, [breeding_event_id, dam_id, sire_id, birth_date, birth_weight, offspring_count, complications, assisted_by, notes]);

      // Get complete record
      const completeRecord = await queryWithRetry(`
        SELECT 
          b.*,
          l_dam.name as dam_name,
          l_sire.name as sire_name,
          u.full_name as assisted_by_name
        FROM births b
        JOIN livestock l_dam ON b.dam_id = l_dam.id
        JOIN livestock l_sire ON b.sire_id = l_sire.id
        LEFT JOIN users u ON b.assisted_by = u.id
        WHERE b.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Birth recorded successfully'
      });
    } catch (error) {
      console.error('Error creating birth record:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create birth record'
      });
    }
  }
);

// Get breeding statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { species, year = new Date().getFullYear() } = req.query;

    let queryText = `
      SELECT 
        l.species,
        COUNT(DISTINCT be.id) as total_breeding_events,
        COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END) as confirmed_pregnancies,
        COUNT(DISTINCT b.id) as total_births,
        SUM(b.offspring_count) as total_offspring,
        AVG(b.birth_weight) as avg_birth_weight
      FROM breeding_events be
      JOIN livestock l ON be.female_id = l.id
      LEFT JOIN pregnancy_checks pc ON be.id = pc.breeding_event_id
      LEFT JOIN births b ON be.id = b.breeding_event_id
      WHERE EXTRACT(YEAR FROM be.service_date) = $1
    `;

    let params = [year];

    if (species) {
      queryText += ' AND l.species = $2';
      params.push(species);
    }

    queryText += ' GROUP BY l.species ORDER BY l.species';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching breeding stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breeding statistics'
    });
  }
});

// Get upcoming due dates
router.get('/due-dates', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await queryWithRetry(`
      SELECT 
        be.*,
        l.name as female_name,
        l.tag as female_tag,
        l.species,
        p.name as pen_name,
        pc.result as pregnancy_result,
        CASE 
          WHEN be.expected_due_date <= CURRENT_DATE THEN 'overdue'
          WHEN be.expected_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'upcoming'
        END as urgency
      FROM breeding_events be
      JOIN livestock l ON be.female_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
      LEFT JOIN pregnancy_checks pc ON be.id = pc.breeding_event_id
      LEFT JOIN births b ON be.id = b.breeding_event_id
      WHERE be.expected_due_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
      AND pc.result = 'pregnant'
      AND b.id IS NULL  -- No birth recorded yet
      ORDER BY be.expected_due_date ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching due dates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch due dates'
    });
  }
});

// Get breeding performance report
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const { year = new Date().getFullYear(), species } = req.query;

    let queryText = `
      SELECT 
        DATE_TRUNC('month', be.service_date) as month,
        l.species,
        COUNT(DISTINCT be.id) as services,
        COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END) as pregnancies,
        COUNT(DISTINCT b.id) as births,
        ROUND(
          COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END)::numeric / 
          NULLIF(COUNT(DISTINCT be.id), 0) * 100, 2
        ) as conception_rate,
        ROUND(
          COUNT(DISTINCT b.id)::numeric / 
          NULLIF(COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END), 0) * 100, 2
        ) as birth_rate
      FROM breeding_events be
      JOIN livestock l ON be.female_id = l.id
      LEFT JOIN pregnancy_checks pc ON be.id = pc.breeding_event_id
      LEFT JOIN births b ON be.id = b.breeding_event_id
      WHERE EXTRACT(YEAR FROM be.service_date) = $1
    `;

    let params = [year];

    if (species) {
      queryText += ' AND l.species = $2';
      params.push(species);
    }

    queryText += `
      GROUP BY DATE_TRUNC('month', be.service_date), l.species
      ORDER BY month DESC, l.species
    `;

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching breeding performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breeding performance'
    });
  }
});

module.exports = router;