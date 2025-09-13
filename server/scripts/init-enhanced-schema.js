const { pool, queryWithRetry } = require('../pool');
const fs = require('fs');
const path = require('path');

// Initialize enhanced database schema
async function initEnhancedSchema() {
  try {
    console.log('🔧 Starting enhanced database schema initialization...');

    // Read the enhanced schema SQL file
    const schemaPath = path.join(__dirname, '../../scripts/alliance-cropcraft-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      return false;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL commands (basic splitting - might need refinement for complex SQL)
    const commands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`📝 Found ${commands.length} SQL commands to execute`);

    // Execute each command
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.toLowerCase().includes('create table') || 
          command.toLowerCase().includes('alter table') ||
          command.toLowerCase().includes('create index') ||
          command.toLowerCase().includes('create or replace')) {
        
        try {
          await queryWithRetry(command);
          console.log(`✅ Executed command ${i + 1}/${commands.length}`);
        } catch (error) {
          // Some commands might fail if tables/columns already exist - that's OK
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate column') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            console.log(`⚠️  Command ${i + 1} skipped (already exists): ${command.substring(0, 50)}...`);
          } else {
            console.error(`❌ Command ${i + 1} failed:`, error.message);
            console.error(`   Command: ${command.substring(0, 100)}...`);
          }
        }
      }
    }

    // Verify new tables exist
    const tables = [
      'pens', 'pen_assignments', 'weight_records', 'breeding_events', 
      'pregnancy_checks', 'births', 'offspring', 'feed_rations', 
      'feed_inventory', 'feed_logs', 'investors', 'investor_allocations', 
      'vaccinations', 'treatments', 'mortalities', 'notifications'
    ];

    console.log('\n🔍 Verifying table creation...');
    
    for (const table of tables) {
      try {
        const result = await queryWithRetry(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        
        const exists = result.rows[0].exists;
        console.log(`   ${exists ? '✅' : '❌'} Table '${table}': ${exists ? 'EXISTS' : 'MISSING'}`);
      } catch (error) {
        console.log(`   ❌ Table '${table}': ERROR - ${error.message}`);
      }
    }

    // Add sample data if tables are empty
    await addSampleData();

    console.log('\n✅ Enhanced database schema initialization completed!');
    return true;

  } catch (error) {
    console.error('❌ Enhanced schema initialization failed:', error);
    return false;
  }
}

// Add sample data for testing
async function addSampleData() {
  try {
    console.log('\n📊 Adding sample data...');

    // Check if pens table has data
    const pensCount = await queryWithRetry('SELECT COUNT(*) as count FROM pens');
    
    if (parseInt(pensCount.rows[0].count) === 0) {
      console.log('   Adding sample pens...');
      
      await queryWithRetry(`
        INSERT INTO pens (name, capacity, species, location, notes) VALUES
          ('Pen A1', 20, 'cattle', 'North Pasture', 'Main cattle pen with shade'),
          ('Pen B1', 15, 'goat', 'East Section', 'Goat pen with feeding troughs'),
          ('Pen C1', 25, 'sheep', 'South Field', 'Large sheep grazing area'),
          ('Pen D1', 10, 'cattle', 'West Paddock', 'Isolation/quarantine pen')
        ON CONFLICT (name) DO NOTHING
      `);
      
      console.log('   ✅ Sample pens added');
    } else {
      console.log('   ⚠️  Pens table already has data, skipping sample data');
    }

    // Check if feed_inventory has data
    const inventoryCount = await queryWithRetry('SELECT COUNT(*) as count FROM feed_inventory');
    
    if (parseInt(inventoryCount.rows[0].count) === 0) {
      console.log('   Adding sample feed inventory...');
      
      await queryWithRetry(`
        INSERT INTO feed_inventory (item_name, item_type, current_stock, unit, cost_per_unit) VALUES
          ('Premium Cattle Feed', 'feed', 500.00, 'kg', 85.00),
          ('Goat Pellets', 'feed', 300.00, 'kg', 120.00),
          ('Hay Bales', 'feed', 50.00, 'bales', 1500.00),
          ('Vitamin Supplement', 'supplement', 20.00, 'bottles', 2500.00),
          ('Deworming Medicine', 'drug', 10.00, 'bottles', 3500.00)
      `);
      
      console.log('   ✅ Sample feed inventory added');
    } else {
      console.log('   ⚠️  Feed inventory already has data, skipping sample data');
    }

    console.log('📊 Sample data initialization completed');

  } catch (error) {
    console.error('❌ Sample data initialization failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  initEnhancedSchema()
    .then(() => {
      console.log('🎉 Database initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initEnhancedSchema, addSampleData };