const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validatePen, validatePenAssignment, validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// PEN MANAGEMENT ROUTES
// ============================================================================

// Get all pens with details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(`
      SELECT 
        p.*,
        COALESCE(livestock_count.count, 0) as current_occupancy,
        pa.id as assignment_id,
        pa.attendant_id,
        pa.supervisor_id,
        pa.assigned_date,
        pa.notes as assignment_notes,
        u_att.full_name as attendant_name,
        u_sup.full_name as supervisor_name
      FROM pens p
      LEFT JOIN (
        SELECT pen_id, COUNT(*) as count 
        FROM livestock 
        WHERE status = 'active' 
        GROUP BY pen_id
      ) livestock_count ON p.id = livestock_count.pen_id
      LEFT JOIN pen_assignments pa ON p.id = pa.pen_id AND pa.is_active = true
      LEFT JOIN users u_att ON pa.attendant_id = u_att.id
      LEFT JOIN users u_sup ON pa.supervisor_id = u_sup.id
      ORDER BY p.name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pens'
    });
  }
});

// Get pen by ID
router.get('/:id', authenticateToken, validateId, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await queryWithRetry(`
      SELECT 
        p.*,
        COALESCE(livestock_count.count, 0) as current_occupancy,
        pa.id as assignment_id,
        pa.attendant_id,
        pa.supervisor_id,
        pa.assigned_date,
        pa.notes as assignment_notes,
        u_att.full_name as attendant_name,
        u_sup.full_name as supervisor_name
      FROM pens p
      LEFT JOIN (
        SELECT pen_id, COUNT(*) as count 
        FROM livestock 
        WHERE status = 'active' 
        GROUP BY pen_id
      ) livestock_count ON p.id = livestock_count.pen_id
      LEFT JOIN pen_assignments pa ON p.id = pa.pen_id AND pa.is_active = true
      LEFT JOIN users u_att ON pa.attendant_id = u_att.id
      LEFT JOIN users u_sup ON pa.supervisor_id = u_sup.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pen not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching pen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pen'
    });
  }
});

// Create new pen
router.post('/', 
  authenticateToken, 
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  validatePen,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, capacity, species, location, notes } = req.body;

      // Check if pen name already exists
      const existingPen = await queryWithRetry(
        'SELECT id FROM pens WHERE name = $1',
        [name]
      );

      if (existingPen.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Pen name already exists'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO pens (name, capacity, species, location, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [name, capacity, species, location, notes]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Pen created successfully'
      });
    } catch (error) {
      console.error('Error creating pen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pen'
      });
    }
  }
);

// Update pen
router.put('/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  validateId,
  validatePen,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, capacity, species, location, notes } = req.body;

      // Check if pen exists
      const existingPen = await queryWithRetry('SELECT * FROM pens WHERE id = $1', [id]);
      if (existingPen.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pen not found'
        });
      }

      // Check if new name conflicts with existing pen (excluding current pen)
      if (name !== existingPen.rows[0].name) {
        const nameCheck = await queryWithRetry(
          'SELECT id FROM pens WHERE name = $1 AND id != $2',
          [name, id]
        );

        if (nameCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Pen name already exists'
          });
        }
      }

      const result = await queryWithRetry(`
        UPDATE pens 
        SET name = $1, capacity = $2, species = $3, location = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [name, capacity, species, location, notes, id]);

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Pen updated successfully'
      });
    } catch (error) {
      console.error('Error updating pen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update pen'
      });
    }
  }
);

// Delete pen
router.delete('/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if pen has livestock
      const livestockCheck = await queryWithRetry(
        'SELECT COUNT(*) as count FROM livestock WHERE pen_id = $1 AND status = \'active\'',
        [id]
      );

      if (parseInt(livestockCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete pen with active livestock. Please move animals first.'
        });
      }

      // Delete pen assignments first
      await queryWithRetry('DELETE FROM pen_assignments WHERE pen_id = $1', [id]);

      // Delete pen
      const result = await queryWithRetry('DELETE FROM pens WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pen not found'
        });
      }

      res.json({
        success: true,
        message: 'Pen deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting pen:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete pen'
      });
    }
  }
);

// ============================================================================
// PEN ASSIGNMENT ROUTES
// ============================================================================

// Get all pen assignments
router.get('/assignments', authenticateToken, async (req, res) => {
  try {
    const result = await queryWithRetry(`
      SELECT 
        pa.*,
        p.name as pen_name,
        p.species as pen_species,
        u_att.full_name as attendant_name,
        u_sup.full_name as supervisor_name
      FROM pen_assignments pa
      JOIN pens p ON pa.pen_id = p.id
      LEFT JOIN users u_att ON pa.attendant_id = u_att.id
      LEFT JOIN users u_sup ON pa.supervisor_id = u_sup.id
      WHERE pa.is_active = true
      ORDER BY p.name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching pen assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pen assignments'
    });
  }
});

// Create pen assignment
router.post('/assignments',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  validatePenAssignment,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pen_id, attendant_id, supervisor_id, notes } = req.body;

      // Validate that attendant has correct role
      if (attendant_id) {
        const attendantCheck = await queryWithRetry(
          'SELECT role FROM users WHERE id = $1',
          [attendant_id]
        );
        
        if (attendantCheck.rows.length === 0 || attendantCheck.rows[0].role !== 'Farm Attendant') {
          return res.status(400).json({
            success: false,
            message: 'Selected user is not a Farm Attendant'
          });
        }
      }

      // Validate that supervisor has correct role
      if (supervisor_id) {
        const supervisorCheck = await queryWithRetry(
          'SELECT role FROM users WHERE id = $1',
          [supervisor_id]
        );
        
        if (supervisorCheck.rows.length === 0 || supervisorCheck.rows[0].role !== 'Supervisor') {
          return res.status(400).json({
            success: false,
            message: 'Selected user is not a Supervisor'
          });
        }
      }

      // Deactivate existing assignments for this pen
      await queryWithRetry(
        'UPDATE pen_assignments SET is_active = false WHERE pen_id = $1',
        [pen_id]
      );

      // Create new assignment
      const result = await queryWithRetry(`
        INSERT INTO pen_assignments (pen_id, attendant_id, supervisor_id, notes, assigned_date, is_active, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, true, CURRENT_TIMESTAMP)
        RETURNING *
      `, [pen_id, attendant_id, supervisor_id, notes]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Pen assignment created successfully'
      });
    } catch (error) {
      console.error('Error creating pen assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create pen assignment'
      });
    }
  }
);

// Update pen assignment
router.put('/assignments/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  validateId,
  validatePenAssignment,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { attendant_id, supervisor_id, notes } = req.body;

      const result = await queryWithRetry(`
        UPDATE pen_assignments 
        SET attendant_id = $1, supervisor_id = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [attendant_id, supervisor_id, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pen assignment not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Pen assignment updated successfully'
      });
    } catch (error) {
      console.error('Error updating pen assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update pen assignment'
      });
    }
  }
);

// Get pens assigned to current user
router.get('/my-assignments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let queryText = `
      SELECT 
        p.*,
        COALESCE(livestock_count.count, 0) as current_occupancy,
        pa.assigned_date,
        pa.notes as assignment_notes,
        CASE 
          WHEN pa.attendant_id = $1 THEN 'attendant'
          WHEN pa.supervisor_id = $1 THEN 'supervisor'
          ELSE 'unknown'
        END as assignment_type
      FROM pens p
      INNER JOIN pen_assignments pa ON p.id = pa.pen_id AND pa.is_active = true
      LEFT JOIN (
        SELECT pen_id, COUNT(*) as count 
        FROM livestock 
        WHERE status = 'active' 
        GROUP BY pen_id
      ) livestock_count ON p.id = livestock_count.pen_id
      WHERE (pa.attendant_id = $1 OR pa.supervisor_id = $1)
      ORDER BY p.name
    `;

    const result = await queryWithRetry(queryText, [userId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching user pen assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pen assignments'
    });
  }
});

module.exports = router;