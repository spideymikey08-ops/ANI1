-- Aniya / AniTrack database
-- Uses ONE database only: aniyatrack.
-- Safe to run against an existing installation: it does not drop existing tables or records.

CREATE DATABASE IF NOT EXISTS aniyatrack
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE aniyatrack;

CREATE TABLE IF NOT EXISTS plots (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    crop_type ENUM('Rice') NOT NULL DEFAULT 'Rice',
    status ENUM('Available','Occupied','Maintenance') NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plantings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plot_id INT UNSIGNED NOT NULL,
    crop_name VARCHAR(150) NOT NULL,
    variety VARCHAR(150) DEFAULT NULL,
    planted_date DATE NOT NULL,
    expected_harvest_date DATE DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_planting_plot FOREIGN KEY (plot_id)
        REFERENCES plots(id) ON DELETE CASCADE,
    INDEX idx_planting_date (planted_date),
    INDEX idx_expected_harvest (expected_harvest_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS watering_tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plot_id INT UNSIGNED NOT NULL,
    task_date DATE NOT NULL,
    task_type ENUM('Water','Fertilize','Weed','Pest Control','Inspect','Other') NOT NULL DEFAULT 'Water',
    done TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_watering_plot FOREIGN KEY (plot_id)
        REFERENCES plots(id) ON DELETE CASCADE,
    INDEX idx_task_date_done (task_date, done)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS harvests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plot_id INT UNSIGNED NOT NULL,
    harvest_date DATE NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_harvest_plot FOREIGN KEY (plot_id)
        REFERENCES plots(id) ON DELETE CASCADE,
    INDEX idx_harvest_date (harvest_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seeds (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seed_name VARCHAR(150) NOT NULL,
    crop_type ENUM('Rice') NOT NULL DEFAULT 'Rice',
    quantity_g DECIMAL(10,2) NOT NULL DEFAULT 0,
    threshold_g DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS finance_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plot_id INT UNSIGNED NOT NULL,
    transaction_type ENUM('Expense','Income') NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    transaction_date DATE NOT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_finance_plot FOREIGN KEY (plot_id)
        REFERENCES plots(id) ON DELETE CASCADE,
    INDEX idx_finance_date (transaction_date),
    INDEX idx_finance_type (transaction_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) DEFAULT NULL,
    username VARCHAR(30) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','user') NOT NULL DEFAULT 'user',
    status ENUM('active','deactivated') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED DEFAULT NULL,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_log_created (created_at),
    INDEX idx_log_action (action)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Migrations for existing databases
-- ---------------------------------------------------------------------

-- Ensure email, phone, role, status columns exist in users table
DROP PROCEDURE IF EXISTS migrate_users_table;
DELIMITER //
CREATE PROCEDURE migrate_users_table()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'email'
    ) THEN
        ALTER TABLE users
            ADD COLUMN email VARCHAR(150) NOT NULL UNIQUE AFTER full_name;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'phone'
    ) THEN
        ALTER TABLE users
            ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER email;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'role'
    ) THEN
        ALTER TABLE users
            ADD COLUMN role ENUM('admin','user') NOT NULL DEFAULT 'user' AFTER password_hash;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'status'
    ) THEN
        ALTER TABLE users
            ADD COLUMN status ENUM('active','deactivated') NOT NULL DEFAULT 'active' AFTER role;
    END IF;

    -- Ensure any existing 'admin' user is granted the admin role
    UPDATE users SET role = 'admin' WHERE username = 'admin';
END //
DELIMITER ;
CALL migrate_users_table();
DROP PROCEDURE IF EXISTS migrate_users_table;

-- Ensure task_type exists in watering_tasks table
DROP PROCEDURE IF EXISTS migrate_watering_task_type;
DELIMITER //
CREATE PROCEDURE migrate_watering_task_type()
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'watering_tasks'
          AND COLUMN_NAME = 'task_type'
    ) THEN
        ALTER TABLE watering_tasks
            ADD COLUMN task_type ENUM(
                'Water',
                'Fertilize',
                'Weed',
                'Pest Control',
                'Inspect',
                'Other'
            ) NOT NULL DEFAULT 'Water' AFTER task_date;
    END IF;
END //
DELIMITER ;
CALL migrate_watering_task_type();
DROP PROCEDURE IF EXISTS migrate_watering_task_type;

-- ---------------------------------------------------------------------
-- Starter Sample Data (safe: INSERT IGNORE skips existing IDs)
-- ---------------------------------------------------------------------
-- Default Admin: username 'admin', password 'admin123'
INSERT IGNORE INTO users (id, full_name, email, phone, username, password_hash, role, status) VALUES
(1, 'System Administrator', 'admin@aniya.local', '09123456789', 'admin', '$2y$10$zoNQFRXSP6wNugkS082EAu/kb1V/jPE9G4AHtPUSGj7EVqy2G3uFa', 'admin', 'active'),
(2, 'Farmer Juan', 'farmer1@aniya.local', '09987654321', 'farmer1', '$2y$10$zoNQFRXSP6wNugkS082EAu/kb1V/jPE9G4AHtPUSGj7EVqy2G3uFa', 'user', 'active');

INSERT IGNORE INTO plots (id, name, crop_type, status) VALUES
(1, 'Plot 1 - North Paddy', 'Rice', 'Occupied'),
(2, 'Plot 2 - South Paddy', 'Rice', 'Available'),
(3, 'Plot 3 - East Terrace', 'Rice', 'Maintenance');

INSERT IGNORE INTO plantings (id, plot_id, crop_name, variety, planted_date, expected_harvest_date, notes) VALUES
(1, 1, 'Rice', 'NSIC Rc 222 (Tubigan 18)', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 115 DAY), 'Direct wet-seeded');

INSERT IGNORE INTO seeds (id, seed_name, crop_type, quantity_g, threshold_g) VALUES
(1, 'NSIC Rc 222 (Tubigan 18)', 'Rice', 25000.00, 5000.00),
(2, 'PSB Rc 10 (Pagsanjan)', 'Rice', 4000.00, 5000.00),
(3, 'IR64 Inbred Rice', 'Rice', 15000.00, 3000.00);

INSERT IGNORE INTO watering_tasks (id, plot_id, task_date, task_type, done) VALUES
(1, 1, CURDATE(), 'Water', 0),
(2, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Fertilize', 0),
(3, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Inspect', 0);

INSERT IGNORE INTO finance_transactions (id, plot_id, transaction_type, category, amount, transaction_date, notes) VALUES
(1, 1, 'Expense', 'Seed', 2200.00, CURDATE(), 'Purchased 2 bags certified seeds'),
(2, 1, 'Expense', 'Fertilizer', 3500.00, CURDATE(), 'Complete 14-14-14 fertilizer');

INSERT IGNORE INTO activity_logs (user_id, username, action, details) VALUES
(1, 'admin', 'System Initialized', 'Database and default admin account configured');
