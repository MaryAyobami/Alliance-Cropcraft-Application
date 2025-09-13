import { BaseModel } from './BaseModel.js';
import { query } from '../config/database.js';
import { generateLivestockTag, calculateAge } from '../utils/helpers.js';

export class Livestock extends BaseModel {
  constructor() {
    super('livestock');
  }

  // Get all livestock with pen and assignment details
  async getLivestockWithDetails(options = {}) {
    try {
      const {
        species,
        health_status,
        pen_id,
        search,
        page = 1,
        limit = 20
      } = options;

      let queryText = `
        SELECT 
          l.*,
          p.name as pen_name,
          p.location as pen_location,
          pa.attendant_id,
          pa.supervisor_id,
          u_att.full_name as attendant_name,
          u_sup.full_name as supervisor_name,
          CASE 
            WHEN l.date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(l.date_of_birth))
            ELSE NULL 
          END as calculated_age
        FROM livestock l
        LEFT JOIN pens p ON l.pen_id = p.id
        LEFT JOIN pen_assignments pa ON p.id = pa.pen_id AND pa.is_active = true
        LEFT JOIN users u_att ON pa.attendant_id = u_att.id
        LEFT JOIN users u_sup ON pa.supervisor_id = u_sup.id
        WHERE l.status != 'deleted'
      `;

      let params = [];
      let paramIndex = 1;

      if (species) {
        queryText += ` AND l.species = $${paramIndex}`;
        params.push(species);
        paramIndex++;
      }

      if (health_status) {
        queryText += ` AND l.health_status = $${paramIndex}`;
        params.push(health_status);
        paramIndex++;
      }

      if (pen_id) {
        queryText += ` AND l.pen_id = $${paramIndex}`;
        params.push(pen_id);
        paramIndex++;
      }

      if (search) {
        queryText += ` AND (l.name ILIKE $${paramIndex} OR l.tag ILIKE $${paramIndex} OR l.identification_number ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      queryText += ` ORDER BY l.created_at DESC`;

      // Add pagination
      const offset = (page - 1) * limit;
      queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(queryText, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM livestock l
        WHERE l.status != 'deleted'
      `;
      let countParams = [];
      let countParamIndex = 1;

      if (species) {
        countQuery += ` AND l.species = $${countParamIndex}`;
        countParams.push(species);
        countParamIndex++;
      }

      if (health_status) {
        countQuery += ` AND l.health_status = $${countParamIndex}`;
        countParams.push(health_status);
        countParamIndex++;
      }

      if (pen_id) {
        countQuery += ` AND l.pen_id = $${countParamIndex}`;
        countParams.push(pen_id);
        countParamIndex++;
      }

      if (search) {
        countQuery += ` AND (l.name ILIKE $${countParamIndex} OR l.tag ILIKE $${countParamIndex} OR l.identification_number ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      };
    } catch (error) {
      console.error('Error in Livestock.getLivestockWithDetails:', error);
      throw error;
    }
  }

  // Create livestock with auto-generated tag
  async createLivestock(livestockData) {
    try {
      const { species, pen_id } = livestockData;

      // Generate tag if not provided
      if (!livestockData.tag) {
        const countResult = await query(
          'SELECT COUNT(*) as count FROM livestock WHERE species = $1',
          [species]
        );
        const sequence = parseInt(countResult.rows[0].count) + 1;
        livestockData.tag = generateLivestockTag(species, sequence);
      }

      // Check pen capacity if pen_id is provided
      if (pen_id) {
        const capacityCheck = await query(`
          SELECT 
            p.capacity,
            COALESCE(livestock_count.count, 0) as current_occupancy
          FROM pens p
          LEFT JOIN (
            SELECT pen_id, COUNT(*) as count 
            FROM livestock 
            WHERE status = 'active' 
            GROUP BY pen_id
          ) livestock_count ON p.id = livestock_count.pen_id
          WHERE p.id = $1
        `, [pen_id]);

        const pen = capacityCheck.rows[0];
        if (pen && pen.current_occupancy >= pen.capacity) {
          throw new Error('Pen is at full capacity');
        }
      }

      const result = await this.create(livestockData);
      return result;
    } catch (error) {
      console.error('Error in Livestock.createLivestock:', error);
      throw error;
    }
  }

  // Get livestock by pen
  async getLivestockByPen(penId) {
    try {
      const result = await query(`
        SELECT 
          l.*,
          CASE 
            WHEN l.date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(l.date_of_birth))
            ELSE NULL 
          END as calculated_age
        FROM livestock l
        WHERE l.pen_id = $1 AND l.status = 'active'
        ORDER BY l.name
      `, [penId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error in Livestock.getLivestockByPen:', error);
      throw error;
    }
  }

  // Get livestock by species
  async getLivestockBySpecies(species) {
    try {
      const result = await query(
        'SELECT * FROM livestock WHERE species = $1 AND status = \'active\' ORDER BY name',
        [species]
      );
      return result.rows;
    } catch (error) {
      console.error('Error in Livestock.getLivestockBySpecies:', error);
      throw error;
    }
  }

  // Get breeding animals (males and females by species)
  async getBreedingAnimals(species, gender = null) {
    try {
      let queryText = `
        SELECT 
          l.*,
          p.name as pen_name,
          CASE 
            WHEN l.date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(l.date_of_birth))
            ELSE NULL 
          END as calculated_age
        FROM livestock l
        LEFT JOIN pens p ON l.pen_id = p.id
        WHERE l.species = $1 
        AND l.status = 'active' 
        AND l.health_status IN ('healthy', 'good')
      `;
      
      let params = [species];

      if (gender) {
        queryText += ' AND l.gender = $2';
        params.push(gender);
      }

      queryText += ' ORDER BY l.name';

      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('Error in Livestock.getBreedingAnimals:', error);
      throw error;
    }
  }

  // Get livestock statistics
  async getLivestockStats() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_animals,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_animals,
          COUNT(CASE WHEN status = 'deceased' THEN 1 END) as deceased_animals,
          COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy_animals,
          COUNT(CASE WHEN health_status = 'sick' THEN 1 END) as sick_animals,
          COUNT(CASE WHEN health_status = 'quarantine' THEN 1 END) as quarantine_animals,
          COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_animals,
          COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_animals
        FROM livestock 
        WHERE status != 'deleted'
      `);
      
      const speciesResult = await query(`
        SELECT 
          species,
          COUNT(*) as count
        FROM livestock 
        WHERE status = 'active'
        GROUP BY species
        ORDER BY count DESC
      `);

      return {
        overview: result.rows[0],
        by_species: speciesResult.rows
      };
    } catch (error) {
      console.error('Error in Livestock.getLivestockStats:', error);
      throw error;
    }
  }

  // Move livestock to different pen
  async moveToPen(animalId, newPenId) {
    try {
      // Check new pen capacity
      if (newPenId) {
        const capacityCheck = await query(`
          SELECT 
            p.capacity,
            p.species as pen_species,
            COALESCE(livestock_count.count, 0) as current_occupancy
          FROM pens p
          LEFT JOIN (
            SELECT pen_id, COUNT(*) as count 
            FROM livestock 
            WHERE status = 'active' 
            GROUP BY pen_id
          ) livestock_count ON p.id = livestock_count.pen_id
          WHERE p.id = $1
        `, [newPenId]);

        const pen = capacityCheck.rows[0];
        if (!pen) {
          throw new Error('Pen not found');
        }
        
        if (pen.current_occupancy >= pen.capacity) {
          throw new Error('Target pen is at full capacity');
        }

        // Check if animal species matches pen species
        const animalResult = await query('SELECT species FROM livestock WHERE id = $1', [animalId]);
        const animal = animalResult.rows[0];
        
        if (animal && animal.species !== pen.pen_species) {
          throw new Error('Animal species does not match pen species');
        }
      }

      const result = await this.update(animalId, { pen_id: newPenId });
      return result;
    } catch (error) {
      console.error('Error in Livestock.moveToPen:', error);
      throw error;
    }
  }

  // Update health status
  async updateHealthStatus(animalId, healthStatus, notes = null) {
    try {
      const updateData = { 
        health_status: healthStatus,
        updated_at: new Date()
      };
      
      if (notes) {
        updateData.notes = notes;
      }

      const result = await this.update(animalId, updateData);
      return result;
    } catch (error) {
      console.error('Error in Livestock.updateHealthStatus:', error);
      throw error;
    }
  }

  // Mark animal as deceased
  async markAsDeceased(animalId, causeOfDeath, dateOfDeath = new Date()) {
    try {
      const result = await this.update(animalId, {
        status: 'deceased',
        health_status: 'deceased',
        updated_at: new Date()
      });

      // Also create mortality record
      await query(`
        INSERT INTO mortalities (animal_id, cause_of_death, date_of_death, reported_by, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [animalId, causeOfDeath, dateOfDeath, null]); // reported_by will be set by the controller

      return result;
    } catch (error) {
      console.error('Error in Livestock.markAsDeceased:', error);
      throw error;
    }
  }

  // Search livestock
  async searchLivestock(searchTerm, filters = {}) {
    try {
      const { species, health_status, pen_id } = filters;
      
      let queryText = `
        SELECT 
          l.*,
          p.name as pen_name,
          CASE 
            WHEN l.date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(l.date_of_birth))
            ELSE NULL 
          END as calculated_age
        FROM livestock l
        LEFT JOIN pens p ON l.pen_id = p.id
        WHERE l.status != 'deleted'
        AND (l.name ILIKE $1 OR l.tag ILIKE $1 OR l.identification_number ILIKE $1)
      `;
      
      let params = [`%${searchTerm}%`];
      let paramIndex = 2;

      if (species) {
        queryText += ` AND l.species = $${paramIndex}`;
        params.push(species);
        paramIndex++;
      }

      if (health_status) {
        queryText += ` AND l.health_status = $${paramIndex}`;
        params.push(health_status);
        paramIndex++;
      }

      if (pen_id) {
        queryText += ` AND l.pen_id = $${paramIndex}`;
        params.push(pen_id);
        paramIndex++;
      }

      queryText += ' ORDER BY l.name LIMIT 50';

      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('Error in Livestock.searchLivestock:', error);
      throw error;
    }
  }

  // Get animals needing attention (health alerts)
  async getAnimalsNeedingAttention() {
    try {
      const result = await query(`
        SELECT 
          l.*,
          p.name as pen_name,
          'health_alert' as alert_type,
          'Animal requires health attention' as alert_message
        FROM livestock l
        LEFT JOIN pens p ON l.pen_id = p.id
        WHERE l.health_status IN ('sick', 'quarantine', 'critical')
        AND l.status = 'active'
        
        UNION ALL
        
        SELECT 
          l.*,
          p.name as pen_name,
          'vaccination_due' as alert_type,
          'Vaccination may be due' as alert_message
        FROM livestock l
        LEFT JOIN pens p ON l.pen_id = p.id
        LEFT JOIN vaccinations v ON l.id = v.animal_id
        WHERE l.status = 'active'
        AND (
          v.id IS NULL 
          OR v.next_due_date <= CURRENT_DATE + INTERVAL '7 days'
        )
        
        ORDER BY alert_type, pen_name, name
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error in Livestock.getAnimalsNeedingAttention:', error);
      throw error;
    }
  }

  // Get offspring of an animal
  async getOffspring(parentId, parentType = 'dam') {
    try {
      const field = parentType === 'dam' ? 'dam_id' : 'sire_id';
      const result = await query(
        `SELECT * FROM livestock WHERE ${field} = $1 AND status != 'deleted' ORDER BY date_of_birth DESC`,
        [parentId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error in Livestock.getOffspring:', error);
      throw error;
    }
  }

  // Get parents of an animal
  async getParents(animalId) {
    try {
      const result = await query(`
        SELECT 
          l.*,
          dam.name as dam_name,
          dam.tag as dam_tag,
          sire.name as sire_name,
          sire.tag as sire_tag
        FROM livestock l
        LEFT JOIN livestock dam ON l.dam_id = dam.id
        LEFT JOIN livestock sire ON l.sire_id = sire.id
        WHERE l.id = $1
      `, [animalId]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in Livestock.getParents:', error);
      throw error;
    }
  }
}