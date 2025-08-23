-- Database Schema for Alliance CropCraft Farm Management System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff',
    email_verified BOOLEAN DEFAULT FALSE,
    avatar VARCHAR(500),
    notif_push BOOLEAN DEFAULT TRUE,
    notif_email BOOLEAN DEFAULT TRUE,
    notif_morning TIME DEFAULT '08:00:00',
    notif_evening TIME DEFAULT '18:00:00',
    push_subscription JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens table for email verification
CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TIME,
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium',
    status VARCHAR(20) DEFAULT 'pending',
    tag VARCHAR(20) DEFAULT 'dynamic', -- 'static' or 'dynamic'
    recurrent BOOLEAN DEFAULT FALSE,
    active_date DATE, -- for dynamic tasks
    evidence_photo VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255),
    type VARCHAR(50) DEFAULT 'Task',
    priority VARCHAR(20) DEFAULT 'medium',
    reminder_minutes INTEGER DEFAULT 30,
    notify BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Livestock table
CREATE TABLE IF NOT EXISTS livestock (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    age DECIMAL(4,1), -- in years
    weight DECIMAL(6,2), -- in kg
    health_status VARCHAR(50) DEFAULT 'Healthy',
    location VARCHAR(255),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_livestock_type ON livestock(type);
CREATE INDEX IF NOT EXISTS idx_livestock_health_status ON livestock(health_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Insert sample data for testing
INSERT INTO users (full_name, email, password_hash, role, email_verified) VALUES
('Admin User', 'admin@alliancecropcraft.com', '$2b$10$example.hash.here', 'Admin', TRUE),
('Farm Manager', 'manager@alliancecropcraft.com', '$2b$10$example.hash.here', 'Farm Manager', TRUE),
('Veterinary Doctor', 'vet@alliancecropcraft.com', '$2b$10$example.hash.here', 'Veterinary Doctor', TRUE),
('Farm Attendant', 'attendant@alliancecropcraft.com', '$2b$10$example.hash.here', 'Farm Attendant', TRUE);

-- Insert sample livestock data
INSERT INTO livestock (name, type, breed, age, weight, health_status, location, notes) VALUES
('Bessie', 'Cattle', 'Holstein', 3.5, 450.0, 'Healthy', 'North Pasture', 'Excellent milk producer'),
('Rex', 'Sheep', 'Merino', 2.0, 45.0, 'Healthy', 'South Field', 'Wool quality is outstanding'),
('Billy', 'Goat', 'Nubian', 1.5, 35.0, 'Healthy', 'East Enclosure', 'Very active and friendly'),
('Porky', 'Pig', 'Yorkshire', 1.0, 120.0, 'Healthy', 'Pig Pen A', 'Growing well on current diet'),
('Cluckers', 'Chicken', 'Rhode Island Red', 0.8, 2.5, 'Healthy', 'Chicken Coop 1', 'Laying consistently');

-- Insert sample tasks
INSERT INTO tasks (title, description, due_date, due_time, assigned_to, created_by, priority, status, tag, recurrent) VALUES
('Morning Feeding', 'Feed all livestock in the morning', CURRENT_DATE, '08:00:00', 4, 1, 'High', 'pending', 'static', TRUE),
('Health Check', 'Routine health inspection of all animals', CURRENT_DATE, '14:00:00', 3, 1, 'Medium', 'pending', 'static', TRUE),
('Pasture Rotation', 'Move cattle to new grazing area', CURRENT_DATE, '10:00:00', 4, 2, 'Medium', 'pending', 'dynamic', FALSE);

-- Insert sample events
INSERT INTO events (title, description, event_date, event_time, location, type, priority) VALUES
('Veterinary Visit', 'Monthly health check and vaccinations', CURRENT_DATE + INTERVAL '7 days', '09:00:00', 'Main Barn', 'Meeting', 'high'),
('Staff Meeting', 'Weekly farm operations review', CURRENT_DATE + INTERVAL '3 days', '16:00:00', 'Office', 'Meeting', 'medium'),
('Equipment Maintenance', 'Schedule tractor and equipment maintenance', CURRENT_DATE + INTERVAL '14 days', '08:00:00', 'Equipment Shed', 'Task', 'low');