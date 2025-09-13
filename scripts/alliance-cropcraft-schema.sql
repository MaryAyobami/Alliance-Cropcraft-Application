-- Alliance CropCraft - Enhanced Database Schema for Simplified Spec
-- This script extends the existing database with new tables and roles
-- Preserves all existing user roles and adds Supervisor/Investor

-- ============================================================================
-- USER ROLES EXTENSION
-- ============================================================================

-- First, let's preserve existing roles and add new ones
-- Assuming the role column is VARCHAR, we'll update it to support the new roles

-- Add new roles to any existing enum or check constraint
-- If role is a simple VARCHAR, this will work. If it's an enum, we'll need to alter the type.

-- Update role check constraint to include new roles (if it exists)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check 
--   CHECK (role IN (
--     'Farm Attendant', 'Veterinary Doctor', 'Pasture Officer', 'Admin', 
--     'Farm Manager', 'Maintenance Officer', 'Feed Production Officer',
--     'Supervisor', 'Investor'  -- New roles added
--   ));

-- ============================================================================
-- CORE DATA MODELS EXTENSION
-- ============================================================================

-- Pen Management
CREATE TABLE IF NOT EXISTS pens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    species VARCHAR(50) NOT NULL, -- 'cattle', 'goat', 'sheep', etc.
    current_occupancy INTEGER DEFAULT 0 CHECK (current_occupancy >= 0),
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pen Assignments (Pen -> Attendant -> Supervisor hierarchy)
CREATE TABLE IF NOT EXISTS pen_assignments (
    id SERIAL PRIMARY KEY,
    pen_id INTEGER REFERENCES pens(id) ON DELETE CASCADE,
    attendant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure attendant is actually an attendant role
    CONSTRAINT check_attendant_role CHECK (
        attendant_id IS NULL OR 
        (SELECT role FROM users WHERE id = attendant_id) = 'Farm Attendant'
    ),
    -- Ensure supervisor is actually a supervisor role  
    CONSTRAINT check_supervisor_role CHECK (
        supervisor_id IS NULL OR 
        (SELECT role FROM users WHERE id = supervisor_id) = 'Supervisor'
    )
);

-- Enhanced Animals table (extend existing livestock table or create new)
-- We'll assume livestock table exists and add missing columns
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS tag VARCHAR(50) UNIQUE;
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS sire_id INTEGER REFERENCES livestock(id);
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS dam_id INTEGER REFERENCES livestock(id);
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS pen_id INTEGER REFERENCES pens(id);
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE livestock ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deceased', 'sold', 'transferred'));

-- ============================================================================
-- HEALTH MANAGEMENT SYSTEM
-- ============================================================================

-- Vaccinations
CREATE TABLE IF NOT EXISTS vaccinations (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    vaccine_type VARCHAR(100) NOT NULL,
    vaccine_name VARCHAR(100),
    date_administered DATE NOT NULL,
    next_due_date DATE,
    administered_by INTEGER REFERENCES users(id), -- Vet ID
    batch_number VARCHAR(50),
    dose VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Treatments
CREATE TABLE IF NOT EXISTS treatments (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    drug_name VARCHAR(100),
    dose VARCHAR(50),
    withdrawal_date DATE, -- When animal products can be consumed again
    treatment_date DATE NOT NULL,
    treated_by INTEGER REFERENCES users(id), -- Vet ID
    cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mortality Records
CREATE TABLE IF NOT EXISTS mortalities (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    cause_of_death TEXT NOT NULL,
    date_of_death DATE NOT NULL,
    reported_by INTEGER REFERENCES users(id),
    confirmed_by INTEGER REFERENCES users(id), -- Vet or Supervisor
    disposal_method VARCHAR(100),
    cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- WEIGHT AND GROWTH TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS weight_records (
    id SERIAL PRIMARY KEY,
    animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    weight_kg DECIMAL(6,2) NOT NULL CHECK (weight_kg > 0),
    date_recorded DATE NOT NULL,
    recorded_by INTEGER REFERENCES users(id),
    body_condition_score INTEGER CHECK (body_condition_score BETWEEN 1 AND 5), -- 1=thin, 5=fat
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- BREEDING MANAGEMENT
-- ============================================================================

-- Breeding Events
CREATE TABLE IF NOT EXISTS breeding_events (
    id SERIAL PRIMARY KEY,
    female_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    male_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    breeding_method VARCHAR(50) NOT NULL CHECK (breeding_method IN ('natural', 'artificial_insemination')),
    service_date DATE NOT NULL,
    expected_due_date DATE, -- Calculated: service_date + gestation_period
    recorded_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pregnancy Checks
CREATE TABLE IF NOT EXISTS pregnancy_checks (
    id SERIAL PRIMARY KEY,
    breeding_event_id INTEGER REFERENCES breeding_events(id) ON DELETE CASCADE,
    female_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('pregnant', 'not_pregnant', 'uncertain')),
    checked_by INTEGER REFERENCES users(id), -- Vet ID
    method VARCHAR(50), -- 'palpation', 'ultrasound', 'visual'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Birth Records
CREATE TABLE IF NOT EXISTS births (
    id SERIAL PRIMARY KEY,
    breeding_event_id INTEGER REFERENCES breeding_events(id),
    dam_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    sire_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    birth_weight DECIMAL(5,2),
    offspring_count INTEGER DEFAULT 1 CHECK (offspring_count > 0),
    complications TEXT,
    assisted_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual offspring records (links to main livestock table)
CREATE TABLE IF NOT EXISTS offspring (
    id SERIAL PRIMARY KEY,
    birth_id INTEGER REFERENCES births(id) ON DELETE CASCADE,
    animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE, -- The actual offspring animal record
    sex VARCHAR(10) CHECK (sex IN ('male', 'female')),
    birth_weight DECIMAL(5,2),
    tag VARCHAR(50),
    status VARCHAR(20) DEFAULT 'alive' CHECK (status IN ('alive', 'deceased', 'stillborn')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- FEED AND NUTRITION MANAGEMENT
-- ============================================================================

-- Feed Rations (per pen)
CREATE TABLE IF NOT EXISTS feed_rations (
    id SERIAL PRIMARY KEY,
    pen_id INTEGER REFERENCES pens(id) ON DELETE CASCADE,
    ration_name VARCHAR(100) NOT NULL,
    composition JSONB NOT NULL, -- {"hay": "5kg", "concentrate": "2kg", "water": "ad_libitum"}
    feeding_times TEXT[], -- ["06:00", "12:00", "18:00"]
    cost_per_day DECIMAL(8,2),
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    created_by INTEGER REFERENCES users(id), -- Manager ID
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed Inventory
CREATE TABLE IF NOT EXISTS feed_inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('feed', 'drug', 'supplement', 'equipment')),
    batch_number VARCHAR(50),
    expiry_date DATE,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL, -- 'kg', 'liters', 'pieces', etc.
    cost_per_unit DECIMAL(8,2),
    supplier VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Daily Feed Logs
CREATE TABLE IF NOT EXISTS feed_logs (
    id SERIAL PRIMARY KEY,
    pen_id INTEGER REFERENCES pens(id) ON DELETE CASCADE,
    feed_date DATE NOT NULL,
    morning_fed BOOLEAN DEFAULT FALSE,
    afternoon_fed BOOLEAN DEFAULT FALSE,
    evening_fed BOOLEAN DEFAULT FALSE,
    total_amount_kg DECIMAL(8,2),
    fed_by INTEGER REFERENCES users(id), -- Attendant ID
    approved_by INTEGER REFERENCES users(id), -- Supervisor ID
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INVESTOR MANAGEMENT
-- ============================================================================

-- Investors
CREATE TABLE IF NOT EXISTS investors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Links to users table
    investment_amount DECIMAL(12,2) DEFAULT 0,
    investment_date DATE DEFAULT CURRENT_DATE,
    expected_return_percentage DECIMAL(5,2) DEFAULT 0,
    contact_person VARCHAR(100),
    company_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animal Allocations to Investors
CREATE TABLE IF NOT EXISTS investor_allocations (
    id SERIAL PRIMARY KEY,
    investor_id INTEGER REFERENCES investors(id) ON DELETE CASCADE,
    animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    allocation_percentage DECIMAL(5,2) DEFAULT 100 CHECK (allocation_percentage BETWEEN 0 AND 100),
    allocated_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure total allocation per animal doesn't exceed 100%
    CONSTRAINT unique_animal_investor UNIQUE (animal_id, investor_id)
);

-- ============================================================================
-- NOTIFICATIONS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'vaccination_due', 'health_check', 'breeding_check', etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    due_date DATE,
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    related_animal_id INTEGER REFERENCES livestock(id) ON DELETE CASCADE,
    related_pen_id INTEGER REFERENCES pens(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Livestock indexes
CREATE INDEX IF NOT EXISTS idx_livestock_pen_id ON livestock(pen_id);
CREATE INDEX IF NOT EXISTS idx_livestock_species ON livestock(species);
CREATE INDEX IF NOT EXISTS idx_livestock_health_status ON livestock(health_status);
CREATE INDEX IF NOT EXISTS idx_livestock_tag ON livestock(tag);

-- Health records indexes
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_id ON vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_next_due ON vaccinations(next_due_date);
CREATE INDEX IF NOT EXISTS idx_treatments_animal_id ON treatments(animal_id);
CREATE INDEX IF NOT EXISTS idx_mortalities_date ON mortalities(date_of_death);

-- Weight records indexes
CREATE INDEX IF NOT EXISTS idx_weight_records_animal_id ON weight_records(animal_id);
CREATE INDEX IF NOT EXISTS idx_weight_records_date ON weight_records(date_recorded);

-- Breeding indexes
CREATE INDEX IF NOT EXISTS idx_breeding_events_female ON breeding_events(female_id);
CREATE INDEX IF NOT EXISTS idx_breeding_events_male ON breeding_events(male_id);
CREATE INDEX IF NOT EXISTS idx_births_dam ON births(dam_id);

-- Feed indexes
CREATE INDEX IF NOT EXISTS idx_feed_rations_pen ON feed_rations(pen_id);
CREATE INDEX IF NOT EXISTS idx_feed_logs_pen_date ON feed_logs(pen_id, feed_date);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_due_date ON notifications(due_date);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update pen occupancy when animals are assigned/removed
CREATE OR REPLACE FUNCTION update_pen_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Update occupancy for the old pen (if any)
    IF OLD.pen_id IS NOT NULL THEN
        UPDATE pens 
        SET current_occupancy = (
            SELECT COUNT(*) 
            FROM livestock 
            WHERE pen_id = OLD.pen_id AND status = 'active'
        )
        WHERE id = OLD.pen_id;
    END IF;
    
    -- Update occupancy for the new pen (if any)
    IF NEW.pen_id IS NOT NULL THEN
        UPDATE pens 
        SET current_occupancy = (
            SELECT COUNT(*) 
            FROM livestock 
            WHERE pen_id = NEW.pen_id AND status = 'active'
        )
        WHERE id = NEW.pen_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for livestock pen changes
DROP TRIGGER IF EXISTS trigger_update_pen_occupancy ON livestock;
CREATE TRIGGER trigger_update_pen_occupancy
    AFTER UPDATE OF pen_id OR INSERT OR DELETE ON livestock
    FOR EACH ROW
    EXECUTE FUNCTION update_pen_occupancy();

-- Auto-calculate expected due date for breeding
CREATE OR REPLACE FUNCTION calculate_breeding_due_date()
RETURNS TRIGGER AS $$
DECLARE
    gestation_days INTEGER;
BEGIN
    -- Get gestation period based on species
    SELECT CASE 
        WHEN species = 'cattle' THEN 280
        WHEN species = 'goat' THEN 150
        WHEN species = 'sheep' THEN 147
        WHEN species = 'pig' THEN 114
        ELSE 150 -- Default
    END INTO gestation_days
    FROM livestock WHERE id = NEW.female_id;
    
    -- Set expected due date
    NEW.expected_due_date := NEW.service_date + INTERVAL '1 day' * gestation_days;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for breeding events
DROP TRIGGER IF EXISTS trigger_calculate_breeding_due_date ON breeding_events;
CREATE TRIGGER trigger_calculate_breeding_due_date
    BEFORE INSERT OR UPDATE ON breeding_events
    FOR EACH ROW
    EXECUTE FUNCTION calculate_breeding_due_date();

-- ============================================================================
-- SAMPLE DATA INSERTIONS (for testing)
-- ============================================================================

-- Sample Pens
INSERT INTO pens (name, capacity, species, location, notes) VALUES
    ('Pen A1', 20, 'cattle', 'North Pasture', 'Main cattle pen with shade'),
    ('Pen B1', 15, 'goat', 'East Section', 'Goat pen with feeding troughs'),
    ('Pen C1', 25, 'sheep', 'South Field', 'Large sheep grazing area'),
    ('Pen D1', 10, 'cattle', 'West Paddock', 'Isolation/quarantine pen')
ON CONFLICT (name) DO NOTHING;

-- Sample Feed Inventory
INSERT INTO feed_inventory (item_name, item_type, current_stock, unit, cost_per_unit) VALUES
    ('Premium Cattle Feed', 'feed', 500.00, 'kg', 85.00),
    ('Goat Pellets', 'feed', 300.00, 'kg', 120.00),
    ('Hay Bales', 'feed', 50.00, 'bales', 1500.00),
    ('Vitamin Supplement', 'supplement', 20.00, 'bottles', 2500.00),
    ('Deworming Medicine', 'drug', 10.00, 'bottles', 3500.00)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Livestock with pen and assignment details
CREATE OR REPLACE VIEW livestock_details AS
SELECT 
    l.*,
    p.name as pen_name,
    p.location as pen_location,
    pa.attendant_id,
    pa.supervisor_id,
    u_att.full_name as attendant_name,
    u_sup.full_name as supervisor_name
FROM livestock l
LEFT JOIN pens p ON l.pen_id = p.id
LEFT JOIN pen_assignments pa ON p.id = pa.pen_id AND pa.is_active = TRUE
LEFT JOIN users u_att ON pa.attendant_id = u_att.id
LEFT JOIN users u_sup ON pa.supervisor_id = u_sup.id;

-- Health summary view
CREATE OR REPLACE VIEW animal_health_summary AS
SELECT 
    l.id as animal_id,
    l.name as animal_name,
    l.species,
    l.health_status,
    COUNT(DISTINCT v.id) as total_vaccinations,
    COUNT(DISTINCT t.id) as total_treatments,
    MAX(v.next_due_date) as next_vaccination_due,
    COUNT(DISTINCT wr.id) as weight_records_count,
    (SELECT weight_kg FROM weight_records WHERE animal_id = l.id ORDER BY date_recorded DESC LIMIT 1) as latest_weight
FROM livestock l
LEFT JOIN vaccinations v ON l.id = v.animal_id
LEFT JOIN treatments t ON l.id = t.animal_id
LEFT JOIN weight_records wr ON l.id = wr.animal_id
GROUP BY l.id, l.name, l.species, l.health_status;

-- Investor portfolio view
CREATE OR REPLACE VIEW investor_portfolio AS
SELECT 
    i.id as investor_id,
    u.full_name as investor_name,
    i.investment_amount,
    COUNT(DISTINCT ia.animal_id) as allocated_animals,
    AVG(ia.allocation_percentage) as avg_allocation_percentage,
    STRING_AGG(DISTINCT l.species, ', ') as animal_species
FROM investors i
JOIN users u ON i.user_id = u.id
LEFT JOIN investor_allocations ia ON i.id = ia.investor_id
LEFT JOIN livestock l ON ia.animal_id = l.id
GROUP BY i.id, u.full_name, i.investment_amount;

-- Daily feed requirements
CREATE OR REPLACE VIEW daily_feed_requirements AS
SELECT 
    p.id as pen_id,
    p.name as pen_name,
    p.species,
    p.current_occupancy,
    fr.ration_name,
    fr.composition,
    fr.cost_per_day,
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
    END as evening_status
FROM pens p
LEFT JOIN feed_rations fr ON p.id = fr.pen_id 
    AND fr.effective_from <= CURRENT_DATE 
    AND (fr.effective_until IS NULL OR fr.effective_until >= CURRENT_DATE)
LEFT JOIN feed_logs fl ON p.id = fl.pen_id AND fl.feed_date = CURRENT_DATE;

COMMENT ON TABLE pens IS 'Physical enclosures for livestock management';
COMMENT ON TABLE pen_assignments IS 'Links pens to attendants and supervisors for accountability';
COMMENT ON TABLE vaccinations IS 'Vaccination records with due date tracking';
COMMENT ON TABLE treatments IS 'Medical treatment records with withdrawal periods';
COMMENT ON TABLE mortalities IS 'Death records for livestock tracking';
COMMENT ON TABLE weight_records IS 'Growth monitoring through weight measurements';
COMMENT ON TABLE breeding_events IS 'Breeding activities and service records';
COMMENT ON TABLE pregnancy_checks IS 'Pregnancy confirmation records';
COMMENT ON TABLE births IS 'Birth records with offspring tracking';
COMMENT ON TABLE feed_rations IS 'Feed formulations and schedules per pen';
COMMENT ON TABLE feed_inventory IS 'Feed and drug stock management';
COMMENT ON TABLE investors IS 'Investor information and investment tracking';
COMMENT ON TABLE investor_allocations IS 'Animal ownership allocation to investors';
COMMENT ON TABLE notifications IS 'System notifications for due activities';

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO livestock_admin;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO livestock_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO livestock_readonly;