-- Create database tables for the livestock management system

-- Users table













-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    due_date DATE,
    due_time TIME,
    location VARCHAR(255),
    photo VARCHAR(255),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table (for calendar)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255),
    type VARCHAR(50) DEFAULT 'Task',
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
-- INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
-- ('John Doe', 'john@example.com', '555-0101', '$2b$10$example_hash_1', 'Farmer Attendant'),
-- ('Admin User', 'admin@example.com', '555-0102', '$2b$10$example_hash_2', 'Admin User'),
-- ('Sarah Johnson', 'sarah@example.com', '555-0103', '$2b$10$example_hash_3', 'Veterinary Doctor'),
-- ('Mike Wilson', 'mike@example.com', '555-0104', '$2b$10$example_hash_4', 'Pasture Manager'),
-- ('Emily Chen', 'emily@example.com', '555-0105', '$2b$10$example_hash_5', 'Farmer Attendant'),
-- ('Tom Brown', 'tom@example.com', '555-0106', '$2b$10$example_hash_6', 'Farmer Attendant');

-- -- Insert sample tasks
-- INSERT INTO tasks (title, description, priority, assigned_to, created_by, due_date, due_time, location, status) VALUES
-- ('Feed Cattle - Pasture A', 'Provide morning feed to all cattle in Pasture A. Check water levels.', 'high', 1, 2, CURRENT_DATE, '06:00:00', 'Pasture A', 'completed'),
-- ('Health Check - Dairy Cows', 'Perform routine health inspection on dairy cows. Record any observations.', 'high', 1, 2, CURRENT_DATE, '07:30:00', 'Dairy Section', 'completed'),
-- ('Clean Water Troughs', 'Clean and refill all water troughs in sections A, B, and C.', 'medium', 1, 2, CURRENT_DATE, '08:00:00', 'All Sections', 'pending'),
-- ('Pasture Rotation - Section B', 'Move livestock from Section B to Section C for pasture rotation.', 'medium', 4, 2, CURRENT_DATE, '14:00:00', 'Section B', 'pending'),
-- ('Medication Administration', 'Administer prescribed medication to identified livestock.', 'high', 3, 2, CURRENT_DATE, '15:30:00', 'Medical Bay', 'pending'),
-- ('Equipment Maintenance', 'Routine maintenance check on feeding equipment.', 'low', 4, 2, CURRENT_DATE, '16:00:00', 'Equipment Shed', 'pending'),
-- ('Final Feed - All Livestock', 'Evening feeding for all livestock sections.', 'high', 1, 2, CURRENT_DATE, '18:00:00', 'All Sections', 'pending'),
-- ('Secure Perimeter Gates', 'Check and secure all perimeter gates for the night.', 'medium', 1, 2, CURRENT_DATE, '19:30:00', 'Perimeter', 'pending');

-- -- Insert sample events
-- INSERT INTO events (title, description, event_date, event_time, location, type, priority, created_by) VALUES
-- ('Feed Cattle - Evening', 'Evening feeding schedule', CURRENT_DATE + INTERVAL '1 day', '18:00:00', 'Pasture A', 'Task', 'high', 2),
-- ('Veterinary Checkup', 'Monthly health inspection', CURRENT_DATE + INTERVAL '2 days', '09:00:00', 'Medical Bay', 'Task', 'high', 2),
-- ('Equipment Maintenance', 'Quarterly equipment check', CURRENT_DATE + INTERVAL '3 days', '14:00:00', 'Equipment Shed', 'Task', 'medium', 2),
-- ('Pasture Rotation', 'Rotate livestock to fresh pasture', CURRENT_DATE + INTERVAL '4 days', '10:00:00', 'Section C', 'Task', 'medium', 2);
