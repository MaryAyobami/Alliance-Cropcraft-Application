const express = require('express');
const router = express.Router();
const { pool, queryWithRetry } = require('../pool');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ============================================================================
// ENHANCED REPORTS ROUTES
// ============================================================================

// Supervisor reports
router.get('/supervisor/:supervisorId', 
  authenticateToken, 
  requireRole(['Admin', 'Farm Manager', 'Supervisor']),
  async (req, res) => {
    try {
      const { supervisorId } = req.params;
      const { from, to } = req.query;
      const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = to || new Date().toISOString().split('T')[0];

      // Get supervisor's pen assignments and activities
      const result = await queryWithRetry(`
        SELECT 
          p.name as pen_name,
          p.species,
          p.current_occupancy,
          COUNT(DISTINCT fl.id) as feed_logs_approved,
          COUNT(DISTINCT wr.id) as weight_records,
          COUNT(DISTINCT l.id) as total_animals,
          COUNT(CASE WHEN l.health_status = 'healthy' THEN 1 END) as healthy_animals,
          AVG(wr.body_condition_score) as avg_body_condition_score
        FROM pen_assignments pa
        JOIN pens p ON pa.pen_id = p.id
        LEFT JOIN livestock l ON p.id = l.pen_id AND l.status = 'active'
        LEFT JOIN feed_logs fl ON p.id = fl.pen_id 
          AND fl.approved_by = $1 
          AND fl.feed_date BETWEEN $2 AND $3
        LEFT JOIN weight_records wr ON l.id = wr.animal_id 
          AND wr.recorded_by = $1 
          AND wr.date_recorded BETWEEN $2 AND $3
        WHERE pa.supervisor_id = $1 AND pa.is_active = true
        GROUP BY p.id, p.name, p.species, p.current_occupancy
        ORDER BY p.name
      `, [supervisorId, fromDate, toDate]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error fetching supervisor report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supervisor report'
      });
    }
  }
);

// Investor reports
router.get('/investor/:investorId',
  authenticateToken,
  async (req, res) => {
    try {
      const { investorId } = req.params;
      const { from, to } = req.query;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Check access permissions
      if (userRole === 'Investor') {
        const accessCheck = await queryWithRetry(
          'SELECT id FROM investors WHERE id = $1 AND user_id = $2',
          [investorId, userId]
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

      // Get comprehensive investor report
      const portfolioResult = await queryWithRetry(`
        SELECT 
          l.species,
          COUNT(DISTINCT l.id) as allocated_animals,
          COUNT(CASE WHEN l.health_status = 'healthy' THEN 1 END) as healthy_animals,
          COUNT(CASE WHEN l.status = 'deceased' THEN 1 END) as deceased_animals,
          AVG(wr.weight_kg) as avg_weight,
          COUNT(DISTINCT v.id) as vaccinations_given,
          COUNT(DISTINCT t.id) as treatments_given,
          SUM(t.cost) as treatment_costs
        FROM investor_allocations ia
        JOIN livestock l ON ia.animal_id = l.id
        LEFT JOIN weight_records wr ON l.id = wr.animal_id 
          AND wr.date_recorded BETWEEN $2 AND $3
        LEFT JOIN vaccinations v ON l.id = v.animal_id 
          AND v.date_administered BETWEEN $2 AND $3
        LEFT JOIN treatments t ON l.id = t.animal_id 
          AND t.treatment_date BETWEEN $2 AND $3
        WHERE ia.investor_id = $1
        GROUP BY l.species
        ORDER BY l.species
      `, [investorId, fromDate, toDate]);

      // Get monthly performance data
      const performanceResult = await queryWithRetry(`
        SELECT 
          DATE_TRUNC('month', wr.date_recorded) as month,
          AVG(wr.weight_kg) as avg_weight,
          COUNT(DISTINCT wr.animal_id) as animals_weighed,
          COUNT(DISTINCT v.animal_id) as animals_vaccinated,
          COUNT(DISTINCT m.animal_id) as mortalities
        FROM investor_allocations ia
        LEFT JOIN weight_records wr ON ia.animal_id = wr.animal_id 
          AND wr.date_recorded BETWEEN $2 AND $3
        LEFT JOIN vaccinations v ON ia.animal_id = v.animal_id 
          AND v.date_administered BETWEEN $2 AND $3
        LEFT JOIN mortalities m ON ia.animal_id = m.animal_id 
          AND m.date_of_death BETWEEN $2 AND $3
        WHERE ia.investor_id = $1
        GROUP BY DATE_TRUNC('month', wr.date_recorded)
        ORDER BY month DESC
      `, [investorId, fromDate, toDate]);

      res.json({
        success: true,
        data: {
          portfolio_summary: portfolioResult.rows,
          monthly_performance: performanceResult.rows,
          period: { from: fromDate, to: toDate }
        }
      });
    } catch (error) {
      console.error('Error fetching investor report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch investor report'
      });
    }
  }
);

// Health coverage report
router.get('/health-coverage', authenticateToken, async (req, res) => {
  try {
    const { species, from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    let queryText = `
      SELECT 
        l.species,
        p.name as pen_name,
        COUNT(DISTINCT l.id) as total_animals,
        COUNT(DISTINCT v.animal_id) as vaccinated_animals,
        ROUND(
          COUNT(DISTINCT v.animal_id)::numeric / 
          NULLIF(COUNT(DISTINCT l.id), 0) * 100, 1
        ) as vaccination_coverage,
        COUNT(DISTINCT t.animal_id) as treated_animals,
        COUNT(DISTINCT CASE WHEN wr.body_condition_score >= 3 THEN wr.animal_id END) as good_condition_animals
      FROM livestock l
      LEFT JOIN pens p ON l.pen_id = p.id
      LEFT JOIN vaccinations v ON l.id = v.animal_id 
        AND v.date_administered BETWEEN $1 AND $2
      LEFT JOIN treatments t ON l.id = t.animal_id 
        AND t.treatment_date BETWEEN $1 AND $2
      LEFT JOIN weight_records wr ON l.id = wr.animal_id 
        AND wr.date_recorded BETWEEN $1 AND $2
      WHERE l.status = 'active'
    `;

    let params = [fromDate, toDate];

    if (species) {
      queryText += ' AND l.species = $3';
      params.push(species);
    }

    queryText += ' GROUP BY l.species, p.name ORDER BY l.species, p.name';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching health coverage report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health coverage report'
    });
  }
});

// Mortality report
router.get('/mortality', authenticateToken, async (req, res) => {
  try {
    const { species, from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    let queryText = `
      SELECT 
        l.species,
        p.name as pen_name,
        DATE_TRUNC('month', m.date_of_death) as month,
        COUNT(m.id) as deaths,
        STRING_AGG(DISTINCT m.cause_of_death, ', ') as common_causes,
        AVG(EXTRACT(YEAR FROM AGE(l.date_of_birth, m.date_of_death))) as avg_age_at_death
      FROM mortalities m
      JOIN livestock l ON m.animal_id = l.id
      LEFT JOIN pens p ON l.pen_id = p.id
      WHERE m.date_of_death BETWEEN $1 AND $2
    `;

    let params = [fromDate, toDate];

    if (species) {
      queryText += ' AND l.species = $3';
      params.push(species);
    }

    queryText += ' GROUP BY l.species, p.name, DATE_TRUNC(\'month\', m.date_of_death) ORDER BY month DESC, l.species';

    const result = await queryWithRetry(queryText, params);

    // Get overall mortality statistics
    const statsResult = await queryWithRetry(`
      SELECT 
        l.species,
        COUNT(DISTINCT l.id) as total_animals_ever,
        COUNT(DISTINCT m.id) as total_deaths,
        ROUND(
          COUNT(DISTINCT m.id)::numeric / 
          NULLIF(COUNT(DISTINCT l.id), 0) * 100, 2
        ) as mortality_rate
      FROM livestock l
      LEFT JOIN mortalities m ON l.id = m.animal_id 
        AND m.date_of_death BETWEEN $1 AND $2
      ${species ? 'WHERE l.species = $3' : ''}
      GROUP BY l.species
      ORDER BY l.species
    `, species ? [fromDate, toDate, species] : [fromDate, toDate]);

    res.json({
      success: true,
      data: {
        monthly_data: result.rows,
        overall_stats: statsResult.rows,
        period: { from: fromDate, to: toDate }
      }
    });
  } catch (error) {
    console.error('Error fetching mortality report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mortality report'
    });
  }
});

// Breeding report
router.get('/breeding', authenticateToken, async (req, res) => {
  try {
    const { species, from, to } = req.query;
    const fromDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];

    let queryText = `
      SELECT 
        l.species,
        DATE_TRUNC('month', be.service_date) as month,
        COUNT(DISTINCT be.id) as breeding_services,
        COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END) as confirmed_pregnancies,
        COUNT(DISTINCT b.id) as births,
        SUM(b.offspring_count) as total_offspring,
        ROUND(
          COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END)::numeric / 
          NULLIF(COUNT(DISTINCT be.id), 0) * 100, 1
        ) as conception_rate,
        ROUND(
          COUNT(DISTINCT b.id)::numeric / 
          NULLIF(COUNT(DISTINCT CASE WHEN pc.result = 'pregnant' THEN be.id END), 0) * 100, 1
        ) as birth_success_rate
      FROM breeding_events be
      JOIN livestock l ON be.female_id = l.id
      LEFT JOIN pregnancy_checks pc ON be.id = pc.breeding_event_id
      LEFT JOIN births b ON be.id = b.breeding_event_id
      WHERE be.service_date BETWEEN $1 AND $2
    `;

    let params = [fromDate, toDate];

    if (species) {
      queryText += ' AND l.species = $3';
      params.push(species);
    }

    queryText += ' GROUP BY l.species, DATE_TRUNC(\'month\', be.service_date) ORDER BY month DESC, l.species';

    const result = await queryWithRetry(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching breeding report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch breeding report'
    });
  }
});

// Feed efficiency report
router.get('/feed-efficiency', authenticateToken, async (req, res) => {
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
        COUNT(DISTINCT fl.feed_date) as feeding_days,
        ROUND(
          SUM(fl.total_amount_kg) / NULLIF(AVG(p.current_occupancy), 0), 2
        ) as feed_per_animal_kg,
        SUM(fr.cost_per_day) as total_feed_cost,
        ROUND(
          SUM(fr.cost_per_day) / NULLIF(AVG(p.current_occupancy), 0), 2
        ) as cost_per_animal
      FROM pens p
      LEFT JOIN feed_logs fl ON p.id = fl.pen_id 
        AND fl.feed_date BETWEEN $1 AND $2
      LEFT JOIN feed_rations fr ON p.id = fr.pen_id 
        AND fr.effective_from <= fl.feed_date
        AND (fr.effective_until IS NULL OR fr.effective_until >= fl.feed_date)
      WHERE p.current_occupancy > 0
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
    console.error('Error fetching feed efficiency report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed efficiency report'
    });
  }
});

// Export report (PDF generation placeholder)
router.get('/export/:reportType', 
  authenticateToken,
  requireRole(['Admin', 'Farm Manager', 'Supervisor', 'Investor']),
  async (req, res) => {
    try {
      const { reportType } = req.params;
      const { investor_id, supervisor_id, from, to, format = 'pdf' } = req.query;

      // This is a placeholder for PDF generation
      // In a real implementation, you would use libraries like puppeteer, jsPDF, or similar
      
      let reportData = {};
      
      switch (reportType) {
        case 'investor':
          if (!investor_id) {
            return res.status(400).json({
              success: false,
              message: 'Investor ID is required for investor reports'
            });
          }
          // Generate investor report data
          reportData = await generateInvestorReportData(investor_id, from, to);
          break;
          
        case 'supervisor':
          if (!supervisor_id) {
            return res.status(400).json({
              success: false,
              message: 'Supervisor ID is required for supervisor reports'
            });
          }
          // Generate supervisor report data
          reportData = await generateSupervisorReportData(supervisor_id, from, to);
          break;
          
        case 'health-coverage':
          reportData = await generateHealthCoverageReportData(from, to);
          break;
          
        case 'mortality':
          reportData = await generateMortalityReportData(from, to);
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type'
          });
      }

      // For now, return JSON data
      // TODO: Implement actual PDF generation
      res.json({
        success: true,
        message: 'Report data generated (PDF generation not implemented yet)',
        data: reportData,
        format: format,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate report'
      });
    }
  }
);

// Helper functions for report generation
async function generateInvestorReportData(investorId, from, to) {
  const fromDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const result = await queryWithRetry(`
    SELECT 
      i.*,
      u.full_name as investor_name,
      COUNT(DISTINCT ia.animal_id) as total_animals,
      COUNT(CASE WHEN l.health_status = 'healthy' THEN 1 END) as healthy_animals,
      COUNT(CASE WHEN l.status = 'deceased' THEN 1 END) as deceased_animals,
      STRING_AGG(DISTINCT l.species, ', ') as species_invested
    FROM investors i
    JOIN users u ON i.user_id = u.id
    LEFT JOIN investor_allocations ia ON i.id = ia.investor_id
    LEFT JOIN livestock l ON ia.animal_id = l.id
    WHERE i.id = $1
    GROUP BY i.id, u.full_name
  `, [investorId]);

  return result.rows[0] || {};
}

async function generateSupervisorReportData(supervisorId, from, to) {
  const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const result = await queryWithRetry(`
    SELECT 
      u.full_name as supervisor_name,
      COUNT(DISTINCT pa.pen_id) as pens_supervised,
      COUNT(DISTINCT fl.id) as feed_logs_approved,
      COUNT(DISTINCT wr.id) as weight_records_created
    FROM users u
    LEFT JOIN pen_assignments pa ON u.id = pa.supervisor_id AND pa.is_active = true
    LEFT JOIN feed_logs fl ON pa.pen_id = fl.pen_id 
      AND fl.approved_by = u.id 
      AND fl.feed_date BETWEEN $2 AND $3
    LEFT JOIN weight_records wr ON wr.recorded_by = u.id 
      AND wr.date_recorded BETWEEN $2 AND $3
    WHERE u.id = $1
    GROUP BY u.id, u.full_name
  `, [supervisorId, fromDate, toDate]);

  return result.rows[0] || {};
}

async function generateHealthCoverageReportData(from, to) {
  const fromDate = from || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const result = await queryWithRetry(`
    SELECT 
      l.species,
      COUNT(DISTINCT l.id) as total_animals,
      COUNT(DISTINCT v.animal_id) as vaccinated_animals,
      COUNT(DISTINCT t.animal_id) as treated_animals,
      ROUND(
        COUNT(DISTINCT v.animal_id)::numeric / 
        NULLIF(COUNT(DISTINCT l.id), 0) * 100, 1
      ) as vaccination_coverage
    FROM livestock l
    LEFT JOIN vaccinations v ON l.id = v.animal_id 
      AND v.date_administered BETWEEN $1 AND $2
    LEFT JOIN treatments t ON l.id = t.animal_id 
      AND t.treatment_date BETWEEN $1 AND $2
    WHERE l.status = 'active'
    GROUP BY l.species
    ORDER BY l.species
  `, [fromDate, toDate]);

  return result.rows;
}

async function generateMortalityReportData(from, to) {
  const fromDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const result = await queryWithRetry(`
    SELECT 
      l.species,
      COUNT(DISTINCT m.id) as total_deaths,
      STRING_AGG(DISTINCT m.cause_of_death, ', ') as causes_of_death,
      DATE_TRUNC('month', m.date_of_death) as month
    FROM mortalities m
    JOIN livestock l ON m.animal_id = l.id
    WHERE m.date_of_death BETWEEN $1 AND $2
    GROUP BY l.species, DATE_TRUNC('month', m.date_of_death)
    ORDER BY month DESC, l.species
  `, [fromDate, toDate]);

  return result.rows;
}

module.exports = router;