const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateInvestor, validateId, handleValidationErrors } = require('../middleware/validation');

// ============================================================================
// INVESTOR MANAGEMENT ROUTES
// ============================================================================

// Get all investors (Admin/Manager only)
router.get('/', 
  authenticateToken, 
  requireRole(['Admin', 'Farm Manager']),
  async (req, res) => {
    try {
      const result = await queryWithRetry(`
        SELECT 
          i.*,
          u.full_name,
          u.email,
          u.phone,
          COUNT(DISTINCT ia.animal_id) as allocated_animals,
          COALESCE(SUM(ia.allocation_percentage), 0) as total_allocation_percentage
        FROM investors i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN investor_allocations ia ON i.id = ia.investor_id
        GROUP BY i.id, u.full_name, u.email, u.phone
        ORDER BY i.investment_date DESC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching investors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch investors'
      });
    }
  }
);

// Get investor by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check if user can access this investor data
    if (userRole === 'Investor') {
      const accessCheck = await queryWithRetry(
        'SELECT id FROM investors WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this investor data'
        });
      }
    } else if (!['Admin', 'Farm Manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const result = await queryWithRetry(`
      SELECT 
        i.*,
        u.full_name,
        u.email,
        u.phone
      FROM investors i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investor not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching investor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investor'
    });
  }
});

// Get investor dashboard data
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check access permissions
    if (userRole === 'Investor') {
      const accessCheck = await queryWithRetry(
        'SELECT id FROM investors WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get investor portfolio overview
    const portfolioResult = await queryWithRetry(`
      SELECT 
        i.*,
        u.full_name as investor_name,
        COUNT(DISTINCT ia.animal_id) as total_allocated_animals,
        COUNT(DISTINCT CASE WHEN l.health_status = 'healthy' THEN ia.animal_id END) as healthy_animals,
        COUNT(DISTINCT CASE WHEN l.status = 'deceased' THEN ia.animal_id END) as deceased_animals,
        STRING_AGG(DISTINCT l.species, ', ') as species_types,
        AVG(ia.allocation_percentage) as avg_allocation_percentage
      FROM investors i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN investor_allocations ia ON i.id = ia.investor_id
      LEFT JOIN livestock l ON ia.animal_id = l.id
      WHERE i.id = $1
      GROUP BY i.id, u.full_name
    `, [id]);

    if (portfolioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investor not found'
      });
    }

    const portfolio = portfolioResult.rows[0];

    // Calculate health coverage and mortality rate
    const healthCoverage = portfolio.total_allocated_animals > 0 
      ? ((portfolio.healthy_animals / portfolio.total_allocated_animals) * 100).toFixed(1)
      : 0;

    const mortalityRate = (portfolio.total_allocated_animals + portfolio.deceased_animals) > 0
      ? ((portfolio.deceased_animals / (portfolio.total_allocated_animals + portfolio.deceased_animals)) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        ...portfolio,
        health_coverage_percentage: parseFloat(healthCoverage),
        mortality_rate_percentage: parseFloat(mortalityRate)
      }
    });
  } catch (error) {
    console.error('Error fetching investor dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investor dashboard'
    });
  }
});

// Get investor KPIs
router.get('/:id/kpis', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Check access permissions
    if (userRole === 'Investor') {
      const accessCheck = await queryWithRetry(
        'SELECT id FROM investors WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const fromDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    // Get health coverage trend
    const healthTrendResult = await queryWithRetry(`
      SELECT 
        DATE_TRUNC('month', v.date_administered) as month,
        COUNT(DISTINCT ia.animal_id) as total_animals,
        COUNT(DISTINCT v.animal_id) as vaccinated_animals,
        ROUND(
          COUNT(DISTINCT v.animal_id)::numeric / 
          NULLIF(COUNT(DISTINCT ia.animal_id), 0) * 100, 1
        ) as health_coverage
      FROM investor_allocations ia
      LEFT JOIN vaccinations v ON ia.animal_id = v.animal_id 
        AND v.date_administered BETWEEN $2 AND $3
      WHERE ia.investor_id = $1
      GROUP BY DATE_TRUNC('month', v.date_administered)
      ORDER BY month DESC
    `, [id, fromDate, toDate]);

    // Get mortality trend
    const mortalityTrendResult = await queryWithRetry(`
      SELECT 
        DATE_TRUNC('month', m.date_of_death) as month,
        COUNT(DISTINCT m.animal_id) as deaths,
        COUNT(DISTINCT ia.animal_id) as total_animals,
        ROUND(
          COUNT(DISTINCT m.animal_id)::numeric / 
          NULLIF(COUNT(DISTINCT ia.animal_id), 0) * 100, 2
        ) as mortality_rate
      FROM investor_allocations ia
      LEFT JOIN mortalities m ON ia.animal_id = m.animal_id 
        AND m.date_of_death BETWEEN $2 AND $3
      WHERE ia.investor_id = $1
      GROUP BY DATE_TRUNC('month', m.date_of_death)
      ORDER BY month DESC
    `, [id, fromDate, toDate]);

    // Get performance history (placeholder - would need actual performance metrics)
    const performanceResult = await queryWithRetry(`
      SELECT 
        DATE_TRUNC('month', wr.date_recorded) as month,
        AVG(wr.weight_kg) as avg_weight,
        COUNT(DISTINCT wr.animal_id) as animals_weighed
      FROM investor_allocations ia
      JOIN weight_records wr ON ia.animal_id = wr.animal_id
      WHERE ia.investor_id = $1
      AND wr.date_recorded BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC('month', wr.date_recorded)
      ORDER BY month DESC
    `, [id, fromDate, toDate]);

    res.json({
      success: true,
      data: {
        healthCoverage: parseFloat(healthTrendResult.rows[0]?.health_coverage || 0),
        mortalityRate: parseFloat(mortalityTrendResult.rows[0]?.mortality_rate || 0),
        healthTrend: healthTrendResult.rows,
        mortalityTrend: mortalityTrendResult.rows,
        performanceHistory: performanceResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching investor KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investor KPIs'
    });
  }
});

// Get investor allocations
router.get('/allocations', authenticateToken, async (req, res) => {
  try {
    const { investor_id } = req.query;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let queryText = `
      SELECT 
        ia.*,
        i.investment_amount,
        u.full_name as investor_name,
        l.name as animal_name,
        l.tag as animal_tag,
        l.species,
        l.health_status,
        p.name as pen_name
      FROM investor_allocations ia
      JOIN investors i ON ia.investor_id = i.id
      JOIN users u ON i.user_id = u.id
      JOIN livestock l ON ia.animal_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
    `;

    let params = [];
    let conditions = [];

    if (investor_id) {
      conditions.push(`ia.investor_id = $${params.length + 1}`);
      params.push(investor_id);
    }

    // If user is an investor, only show their allocations
    if (userRole === 'Investor') {
      conditions.push(`i.user_id = $${params.length + 1}`);
      params.push(userId);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ' ORDER BY ia.allocated_date DESC';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching investor allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investor allocations'
    });
  }
});

// Create investor allocation
router.post('/allocations',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  async (req, res) => {
    try {
      const { investor_id, animal_id, allocation_percentage = 100, notes } = req.body;

      // Verify investor and animal exist
      const investorCheck = await queryWithRetry('SELECT id FROM investors WHERE id = $1', [investor_id]);
      const animalCheck = await queryWithRetry('SELECT id, name FROM livestock WHERE id = $1 AND status = \'active\'', [animal_id]);

      if (investorCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Investor not found'
        });
      }

      if (animalCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Animal not found or inactive'
        });
      }

      // Check if allocation already exists
      const existingAllocation = await queryWithRetry(
        'SELECT id FROM investor_allocations WHERE investor_id = $1 AND animal_id = $2',
        [investor_id, animal_id]
      );

      if (existingAllocation.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Allocation already exists for this investor and animal'
        });
      }

      // Check total allocation percentage for the animal
      const totalAllocationResult = await queryWithRetry(
        'SELECT COALESCE(SUM(allocation_percentage), 0) as total FROM investor_allocations WHERE animal_id = $1',
        [animal_id]
      );

      const currentTotal = parseFloat(totalAllocationResult.rows[0].total);
      if (currentTotal + allocation_percentage > 100) {
        return res.status(400).json({
          success: false,
          message: `Total allocation would exceed 100%. Current: ${currentTotal}%, Requested: ${allocation_percentage}%`
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO investor_allocations (investor_id, animal_id, allocation_percentage, allocated_date, notes, created_at)
        VALUES ($1, $2, $3, CURRENT_DATE, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `, [investor_id, animal_id, allocation_percentage, notes]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Allocation created successfully'
      });
    } catch (error) {
      console.error('Error creating investor allocation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create allocation'
      });
    }
  }
);

// Create investor profile
router.post('/',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  validateInvestor,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { user_id, investment_amount, expected_return_percentage, contact_person, company_name, notes } = req.body;

      // Verify user exists and has Investor role
      const userCheck = await queryWithRetry(
        'SELECT id, role FROM users WHERE id = $1',
        [user_id]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (userCheck.rows[0].role !== 'Investor') {
        return res.status(400).json({
          success: false,
          message: 'User must have Investor role'
        });
      }

      // Check if investor profile already exists
      const existingInvestor = await queryWithRetry(
        'SELECT id FROM investors WHERE user_id = $1',
        [user_id]
      );

      if (existingInvestor.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Investor profile already exists for this user'
        });
      }

      const result = await queryWithRetry(`
        INSERT INTO investors (user_id, investment_amount, investment_date, expected_return_percentage, contact_person, company_name, notes, created_at)
        VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING *
      `, [user_id, investment_amount, expected_return_percentage, contact_person, company_name, notes]);

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Investor profile created successfully'
      });
    } catch (error) {
      console.error('Error creating investor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create investor profile'
      });
    }
  }
);

// Update investor
router.put('/:id',
  authenticateToken,
  requireRole(['Admin', 'Farm Manager']),
  validateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { investment_amount, expected_return_percentage, contact_person, company_name, notes } = req.body;

      const result = await queryWithRetry(`
        UPDATE investors 
        SET investment_amount = $1, expected_return_percentage = $2, contact_person = $3, company_name = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [investment_amount, expected_return_percentage, contact_person, company_name, notes, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Investor not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Investor updated successfully'
      });
    } catch (error) {
      console.error('Error updating investor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update investor'
      });
    }
  }
);

// Get current user's investor dashboard (for logged-in investors)
router.get('/my/dashboard', authenticateToken, requireRole(['Investor']), async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get investor ID
    const investorResult = await queryWithRetry(
      'SELECT id FROM investors WHERE user_id = $1',
      [userId]
    );

    if (investorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investor profile not found'
      });
    }

    const investorId = investorResult.rows[0].id;

    // Redirect to the investor dashboard endpoint
    req.params.id = investorId;
    return router.handle(req, res);
  } catch (error) {
    console.error('Error fetching my investor dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard'
    });
  }
});

module.exports = router;