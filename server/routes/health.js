const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateVaccination, validateTreatment, validateMortality, validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// ENHANCED HEALTH MANAGEMENT ROUTES
// ============================================================================

// Get vaccinations
router.get('/vaccinations', authenticateToken, async (req, res) => {
  try {
    const { animal_id, due_only, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        v.*,
        l.name as animal_name,
        l.tag as animal_tag,
        l.species as animal_species,
        p.name as pen_name,
        u.full_name as administered_by_name
      FROM vaccinations v
      JOIN livestock l ON v.animal_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
      LEFT JOIN users u ON v.administered_by = u.id
    `;

    let params = [];
    let conditions = [];

    if (animal_id) {
      conditions.push(`v.animal_id = $${params.length + 1}`);
      params.push(animal_id);
    }

    if (due_only === 'true') {
      conditions.push(`v.next_due_date <= CURRENT_DATE + INTERVAL '7 days'`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY v.date_administered DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching vaccinations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vaccinations'
    });
  }
});

// Create vaccination record
router.post('/vaccinations',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validateVaccination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { animal_id, vaccine_type, vaccine_name, date_administered, next_due_date, batch_number, dose, notes } = req.body;
      const administered_by = req.user.userId;

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

      const result = await queryWithRetry(`
        INSERT INTO vaccinations (animal_id, vaccine_type, vaccine_name, date_administered, next_due_date, administered_by, batch_number, dose, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `, [animal_id, vaccine_type, vaccine_name, date_administered, next_due_date, administered_by, batch_number, dose, notes]);

      // Get complete record
      const completeRecord = await queryWithRetry(`
        SELECT 
          v.*,
          l.name as animal_name,
          u.full_name as administered_by_name
        FROM vaccinations v
        JOIN livestock l ON v.animal_id = l.id
        LEFT JOIN users u ON v.administered_by = u.id
        WHERE v.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Vaccination recorded successfully'
      });
    } catch (error) {
      console.error('Error creating vaccination:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create vaccination record'
      });
    }
  }
);

// Get treatments
router.get('/treatments', authenticateToken, async (req, res) => {
  try {
    const { animal_id, active_only, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        t.*,
        l.name as animal_name,
        l.tag as animal_tag,
        l.species as animal_species,
        p.name as pen_name,
        u.full_name as treated_by_name,
        CASE 
          WHEN t.withdrawal_date > CURRENT_DATE THEN 'active'
          ELSE 'completed'
        END as treatment_status
      FROM treatments t
      JOIN livestock l ON t.animal_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
      LEFT JOIN users u ON t.treated_by = u.id
    `;

    let params = [];
    let conditions = [];

    if (animal_id) {
      conditions.push(`t.animal_id = $${params.length + 1}`);
      params.push(animal_id);
    }

    if (active_only === 'true') {
      conditions.push(`t.withdrawal_date > CURRENT_DATE`);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY t.treatment_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching treatments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch treatments'
    });
  }
});

// Create treatment record
router.post('/treatments',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validateTreatment,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { animal_id, diagnosis, drug_name, dose, withdrawal_date, treatment_date, cost, notes } = req.body;
      const treated_by = req.user.userId;

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

      const result = await queryWithRetry(`
        INSERT INTO treatments (animal_id, diagnosis, drug_name, dose, withdrawal_date, treatment_date, treated_by, cost, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
      `, [animal_id, diagnosis, drug_name, dose, withdrawal_date, treatment_date, treated_by, cost, notes]);

      // Get complete record
      const completeRecord = await queryWithRetry(`
        SELECT 
          t.*,
          l.name as animal_name,
          u.full_name as treated_by_name
        FROM treatments t
        JOIN livestock l ON t.animal_id = l.id
        LEFT JOIN users u ON t.treated_by = u.id
        WHERE t.id = $1
      `, [result.rows[0].id]);

      res.status(201).json({
        success: true,
        data: completeRecord.rows[0],
        message: 'Treatment recorded successfully'
      });
    } catch (error) {
      console.error('Error creating treatment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create treatment record'
      });
    }
  }
);

// Get mortalities
router.get('/mortalities', authenticateToken, async (req, res) => {
  try {
    const { species, year, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        m.*,
        l.name as animal_name,
        l.tag as animal_tag,
        l.species as animal_species,
        l.age as animal_age,
        p.name as pen_name,
        u_reported.full_name as reported_by_name,
        u_confirmed.full_name as confirmed_by_name
      FROM mortalities m
      JOIN livestock l ON m.animal_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
      LEFT JOIN users u_reported ON m.reported_by = u_reported.id
      LEFT JOIN users u_confirmed ON m.confirmed_by = u_confirmed.id
    `;

    let params = [];
    let conditions = [];

    if (species) {
      conditions.push(`l.species = $${params.length + 1}`);
      params.push(species);
    }

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM m.date_of_death) = $${params.length + 1}`);
      params.push(year);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY m.date_of_death DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching mortalities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mortalities'
    });
  }
});

// Create mortality record
router.post('/mortalities',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Veterinary Doctor', 'Supervisor']),
  validateMortality,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { animal_id, cause_of_death, date_of_death, disposal_method, cost, notes } = req.body;
      const reported_by = req.user.userId;

      // Verify animal exists and is not already deceased
      const animalCheck = await queryWithRetry(
        'SELECT id, name, species, status FROM livestock WHERE id = $1',
        [animal_id]
      );

      if (animalCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Animal not found'
        });
      }

      if (animalCheck.rows[0].status === 'deceased') {
        return res.status(400).json({
          success: false,
          message: 'Animal is already marked as deceased'
        });
      }

      // Start transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Create mortality record
        const mortalityResult = await client.query(`
          INSERT INTO mortalities (animal_id, cause_of_death, date_of_death, reported_by, disposal_method, cost, notes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          RETURNING *
        `, [animal_id, cause_of_death, date_of_death, reported_by, disposal_method, cost, notes]);

        // Update livestock status
        await client.query(
          'UPDATE livestock SET status = \'deceased\', health_status = \'deceased\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [animal_id]
        );

        await client.query('COMMIT');

        // Get complete record
        const completeRecord = await queryWithRetry(`
          SELECT 
            m.*,
            l.name as animal_name,
            l.species as animal_species,
            u.full_name as reported_by_name
          FROM mortalities m
          JOIN livestock l ON m.animal_id = l.id
          LEFT JOIN users u ON m.reported_by = u.id
          WHERE m.id = $1
        `, [mortalityResult.rows[0].id]);

        res.status(201).json({
          success: true,
          data: completeRecord.rows[0],
          message: 'Mortality recorded successfully'
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating mortality record:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create mortality record'
      });
    }
  }
);

// Get health summary for animal or all animals
router.get('/summary/:animalId?', authenticateToken, async (req, res) => {
  try {
    const { animalId } = req.params;

    let queryText = `
      SELECT 
        l.id as animal_id,
        l.name as animal_name,
        l.species,
        l.health_status,
        l.tag,
        p.name as pen_name,
        COUNT(DISTINCT v.id) as total_vaccinations,
        COUNT(DISTINCT t.id) as total_treatments,
        COUNT(DISTINCT wr.id) as weight_records_count,
        MAX(v.next_due_date) as next_vaccination_due,
        MAX(wr.date_recorded) as last_weighed,
        (SELECT weight_kg FROM weight_records WHERE animal_id = l.id ORDER BY date_recorded DESC LIMIT 1) as latest_weight,
        (SELECT body_condition_score FROM weight_records WHERE animal_id = l.id ORDER BY date_recorded DESC LIMIT 1) as latest_bcs
      FROM livestock l
      LEFT JOIN pens p ON l.pen_id = p.id
      LEFT JOIN vaccinations v ON l.id = v.animal_id
      LEFT JOIN treatments t ON l.id = t.animal_id
      LEFT JOIN weight_records wr ON l.id = wr.animal_id
      WHERE l.status = 'active'
    `;

    let params = [];

    if (animalId) {
      queryText += ' AND l.id = $1';
      params.push(animalId);
    }

    queryText += ' GROUP BY l.id, l.name, l.species, l.health_status, l.tag, p.name ORDER BY l.name';

    const result = await queryWithRetry(queryText, params);

    if (animalId && result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animal not found'
      });
    }

    res.json({
      success: true,
      data: animalId ? result.rows[0] : result.rows
    });
  } catch (error) {
    console.error('Error fetching health summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health summary'
    });
  }
});

// Get vaccinations due
router.get('/vaccinations/due', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const result = await queryWithRetry(`
      SELECT 
        v.*,
        l.name as animal_name,
        l.tag as animal_tag,
        l.species,
        p.name as pen_name,
        CASE 
          WHEN v.next_due_date < CURRENT_DATE THEN 'overdue'
          WHEN v.next_due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'urgent'
          ELSE 'upcoming'
        END as urgency,
        CURRENT_DATE - v.next_due_date as days_overdue
      FROM vaccinations v
      JOIN livestock l ON v.animal_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
      WHERE v.next_due_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
      AND l.status = 'active'
      ORDER BY v.next_due_date ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching due vaccinations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch due vaccinations'
    });
  }
});

// Get health statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { species, year = new Date().getFullYear() } = req.query;

    let queryText = `
      SELECT 
        l.species,
        COUNT(DISTINCT l.id) as total_animals,
        COUNT(DISTINCT CASE WHEN l.health_status = 'healthy' THEN l.id END) as healthy_animals,
        COUNT(DISTINCT CASE WHEN l.health_status = 'sick' THEN l.id END) as sick_animals,
        COUNT(DISTINCT CASE WHEN l.health_status = 'quarantine' THEN l.id END) as quarantine_animals,
        COUNT(DISTINCT v.id) as total_vaccinations,
        COUNT(DISTINCT t.id) as total_treatments,
        COUNT(DISTINCT m.id) as total_mortalities,
        ROUND(
          COUNT(DISTINCT CASE WHEN l.health_status = 'healthy' THEN l.id END)::numeric / 
          NULLIF(COUNT(DISTINCT l.id), 0) * 100, 2
        ) as health_percentage,
        ROUND(
          COUNT(DISTINCT m.id)::numeric / 
          NULLIF(COUNT(DISTINCT l.id) + COUNT(DISTINCT m.id), 0) * 100, 2
        ) as mortality_rate
      FROM livestock l
      LEFT JOIN vaccinations v ON l.id = v.animal_id AND EXTRACT(YEAR FROM v.date_administered) = $1
      LEFT JOIN treatments t ON l.id = t.animal_id AND EXTRACT(YEAR FROM t.treatment_date) = $1
      LEFT JOIN mortalities m ON l.id = m.animal_id AND EXTRACT(YEAR FROM m.date_of_death) = $1
      WHERE l.status IN ('active', 'deceased')
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
    console.error('Error fetching health stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health statistics'
    });
  }
});

module.exports = router;