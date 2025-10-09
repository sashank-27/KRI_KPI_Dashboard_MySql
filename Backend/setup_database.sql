-- MySQL Database Setup for KRI KPI Dashboard
-- Run this script in your MySQL server (WAMP/XAMPP) to create the database

-- Create database
CREATE DATABASE IF NOT EXISTS kri_kpi_dashboard;
USE kri_kpi_dashboard;

-- Optional: Create a specific user for the application (you can also use root)
-- CREATE USER IF NOT EXISTS 'kri_user'@'localhost' IDENTIFIED BY 'your_password_here';
-- GRANT ALL PRIVILEGES ON kri_kpi_dashboard.* TO 'kri_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Note: Tables will be created automatically by Sequelize when you start the application
-- The following are the table structures that will be created:

/*
-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('superadmin', 'admin', 'user') NOT NULL,
  departmentId INT NULL,
  isSuperAdmin BOOLEAN DEFAULT FALSE,
  joined DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdById INT NULL,
  avatar TEXT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- KRAs table
CREATE TABLE IF NOT EXISTS kras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  responsibilityAreas JSON NOT NULL,
  departmentId INT NOT NULL,
  assignedToId INT NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NULL,
  status ENUM('active', 'completed', 'cancelled', 'on-hold') DEFAULT 'active',
  createdById INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (assignedToId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Daily Tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task TEXT NOT NULL,
  srId VARCHAR(100) NULL,
  remarks TEXT NOT NULL,
  status ENUM('in-progress', 'closed') DEFAULT 'in-progress',
  date DATE NOT NULL,
  userId INT NOT NULL,
  departmentId INT NOT NULL,
  createdById INT NOT NULL,
  tags JSON NULL,
  attachments JSON NULL,
  escalatedToId INT NULL,
  escalatedById INT NULL,
  escalatedAt DATETIME NULL,
  escalationReason TEXT NULL,
  isEscalated BOOLEAN DEFAULT FALSE,
  originalUserId INT NULL,
  closedAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (escalatedToId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (escalatedById) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (originalUserId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  problem TEXT NOT NULL,
  srId VARCHAR(100) NOT NULL,
  taskId INT NOT NULL,
  solutionFile JSON NOT NULL,
  solvedById INT NOT NULL,
  departmentId INT NULL,
  tags JSON NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES daily_tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (solvedById) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(departmentId);
CREATE INDEX idx_users_created_by ON users(createdById);

CREATE INDEX idx_kras_assigned_status ON kras(assignedToId, status);
CREATE INDEX idx_kras_department_status ON kras(departmentId, status);
CREATE INDEX idx_kras_created_by ON kras(createdById);
CREATE INDEX idx_kras_status ON kras(status);

CREATE INDEX idx_daily_tasks_user_date ON daily_tasks(userId, date);
CREATE INDEX idx_daily_tasks_department_date ON daily_tasks(departmentId, date);
CREATE INDEX idx_daily_tasks_status_date ON daily_tasks(status, date);
CREATE INDEX idx_daily_tasks_sr_id ON daily_tasks(srId);
CREATE INDEX idx_daily_tasks_escalated ON daily_tasks(escalatedToId, isEscalated);
CREATE INDEX idx_daily_tasks_original_user ON daily_tasks(originalUserId, isEscalated);
CREATE INDEX idx_daily_tasks_created_by ON daily_tasks(createdById);

CREATE INDEX idx_faqs_sr_id ON faqs(srId);
CREATE INDEX idx_faqs_solved_by ON faqs(solvedById);
CREATE INDEX idx_faqs_department ON faqs(departmentId);
CREATE INDEX idx_faqs_active_created ON faqs(isActive, createdAt);
CREATE INDEX idx_faqs_task ON faqs(taskId);
*/

-- Sample data (optional)
-- This will be created by the application automatically
/*
INSERT IGNORE INTO departments (name) VALUES 
('IT Department'),
('HR Department'),
('Finance Department'),
('Sales Department');
*/

SHOW TABLES;
SELECT 'Database setup completed successfully!' as status;