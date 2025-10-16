#!/usr/bin/env node

/**
 * KRI KPI Dashboard - Database Administration Utility
 * 
 * This script provides all database administration functions:
 * - Database setup and creation
 * - Connection testing
 * - Password management
 * - Complete schema setup
 * - User seeding
 * 
 * Usage:
 *   node admin-utils.js [command]
 * 
 * Commands:
 *   setup       - Complete database setup (default)
 *   test        - Test database connection
 *   create-db   - Create database only
 *   set-password - Set MySQL root password
 *   help        - Show this help
 * 
 * Examples:
 *   node admin-utils.js
 *   node admin-utils.js setup
 *   node admin-utils.js test
 *   node admin-utils.js create-db
 *   node admin-utils.js set-password
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { getDbConfig } = require('./config/db');
require('dotenv').config();

class DatabaseAdmin {
  constructor() {
    this.dbConfig = getDbConfig();
  }

  async createConnection(options = {}) {
    const config = {
      host: options.host || this.dbConfig.host,
      port: options.port || this.dbConfig.port,
      user: options.user || this.dbConfig.user,
      password: options.password !== undefined ? options.password : this.dbConfig.password,
      database: options.database || null // Don't specify database for initial connection
    };

    return await mysql.createConnection(config);
  }

  // Test database connection with multiple configurations
  async testConnection() {
    console.log('🔧 Testing Database Connection...');
    console.log('================================');
    
    const configs = [
      {
        name: 'Current Environment Config',
        ...this.dbConfig
      },
      {
        name: 'No Password (XAMPP Default)',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        name: 'kri_kpi_dashboard'
      },
      {
        name: 'With netweb password',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: 'netweb',
        name: 'kri_kpi_dashboard'
      },
      {
        name: 'With 123 password',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123',
        name: 'kri_kpi_dashboard'
      }
    ];

    let successfulConfig = null;

    for (const config of configs) {
      try {
        console.log(`\n🔍 Testing: ${config.name}`);
        console.log(`   Host: ${config.host}:${config.port}`);
        console.log(`   User: ${config.user}`);
        console.log(`   Password: ${config.password ? '[SET]' : '[EMPTY]'}`);
        console.log(`   Database: ${config.name}`);

        const connection = await this.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.name
        });

        // Test query
        await connection.execute('SELECT 1');
        await connection.end();

        console.log(`   ✅ SUCCESS!`);
        successfulConfig = config;
        break;
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
      }
    }

    if (successfulConfig) {
      console.log('\n🎉 Database connection successful!');
      console.log('✅ You can proceed with the application');
      return true;
    } else {
      console.log('\n❌ All connection attempts failed!');
      console.log('🔧 Please check your MySQL server and configuration');
      return false;
    }
  }

  // Set MySQL root password
  async setMySQLPassword() {
    console.log('🔐 Setting MySQL Root Password to "netweb"...');
    console.log('============================================');
    
    const connectionAttempts = [
      {
        name: 'No password (current XAMPP default)',
        config: { host: '127.0.0.1', port: 3306, user: 'root', password: '' }
      },
      {
        name: 'With password 123',
        config: { host: '127.0.0.1', port: 3306, user: 'root', password: '123' }
      },
      {
        name: 'With password netweb',
        config: { host: '127.0.0.1', port: 3306, user: 'root', password: 'netweb' }
      }
    ];

    let connection = null;

    for (const attempt of connectionAttempts) {
      try {
        console.log(`\n🔍 Trying to connect with: ${attempt.name}`);
        connection = await mysql.createConnection(attempt.config);
        console.log('✅ Connected successfully!');
        break;
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }

    if (!connection) {
      console.log('\n❌ Could not connect to MySQL with any known configuration');
      console.log('🔧 Please ensure MySQL is running and try manually');
      return false;
    }

    try {
      // Set password using different methods for compatibility
      const passwordCommands = [
        "ALTER USER 'root'@'localhost' IDENTIFIED BY 'netweb'",
        "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('netweb')",
        "UPDATE mysql.user SET Password = PASSWORD('netweb') WHERE User = 'root' AND Host = 'localhost'"
      ];

      for (const command of passwordCommands) {
        try {
          await connection.execute(command);
          console.log(`✅ Password set using: ${command}`);
          break;
        } catch (error) {
          console.log(`⚠️  Command failed: ${command} - ${error.message}`);
        }
      }

      // Flush privileges
      await connection.execute('FLUSH PRIVILEGES');
      console.log('✅ Privileges flushed');

      await connection.end();
      
      console.log('\n🎉 MySQL root password has been set to "netweb"');
      console.log('🔄 Please restart MySQL service and update your .env file');
      return true;

    } catch (error) {
      console.error('❌ Error setting password:', error.message);
      if (connection) await connection.end();
      return false;
    }
  }

  // Create database only
  async createDatabase() {
    console.log('🗄️  Creating Database...');
    console.log('========================');
    
    try {
      // Connect without specifying database
      const connection = await this.createConnection({ database: null });
      console.log('✅ Connected to MySQL server');
      
      // Create database if it doesn't exist
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.dbConfig.name}\``);
      console.log(`✅ Database "${this.dbConfig.name}" created/verified`);
      
      await connection.end();
      console.log('🎉 Database creation completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Error creating database:', error.message);
      return false;
    }
  }

  // Complete database setup
  async setupComplete() {
    console.log('🚀 Starting Complete Database Setup...');
    console.log('═══════════════════════════════════════════════════');
    
    try {
      await this.createDatabaseIfNotExists();
      await this.createTables();
      await this.addBioColumn();
      await this.seedSuperAdmin();
      
      // Get superadmin credentials from environment variables for display
      const superadminConfig = {
        username: process.env.SUPERADMIN_USERNAME || 'admin',
        email: process.env.SUPERADMIN_EMAIL || 'admin@company.com',
        password: process.env.SUPERADMIN_PASSWORD || 'defaultPassword123'
      };
      
      console.log('═══════════════════════════════════════════════════');
      console.log('🎉 Complete database setup finished successfully!');
      console.log('🔐 You can now log in with:');
      console.log(`   Email: ${superadminConfig.email}`);
      console.log(`   Username: ${superadminConfig.username}`);  
      console.log(`   Password: ${superadminConfig.password}`);
      console.log('═══════════════════════════════════════════════════');
      return true;
    } catch (error) {
      console.error('❌ Complete setup failed:', error.message);
      return false;
    }
  }

  async createDatabaseIfNotExists() {
    console.log('📊 Checking if database exists...');
    
    const connection = await this.createConnection({ database: null });
    
    const [databases] = await connection.execute(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [this.dbConfig.name]
    );
    
    if (databases.length === 0) {
      console.log(`🔨 Creating database: ${this.dbConfig.name}`);
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.dbConfig.name}\``);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
    
    await connection.end();
  }

  async createTables() {
    console.log('📋 Creating tables if they don\'t exist...');
    
    const connection = await this.createConnection({ database: this.dbConfig.name });
    
    // Create departments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create users table
    await connection.execute(`
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
        bio TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_departmentId (departmentId),
        INDEX idx_createdById (createdById)
      )
    `);
    
    // Create other tables...
    await connection.execute(`
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
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (assignedToId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task TEXT NOT NULL,
        srId VARCHAR(255) NULL,
        remarks TEXT NOT NULL,
        status ENUM('in-progress', 'closed') DEFAULT 'in-progress',
        date DATE NOT NULL,
        userId INT NOT NULL,
        departmentId INT NOT NULL,
        createdById INT NOT NULL,
        tags JSON NULL,
        escalatedToId INT NULL,
        escalatedById INT NULL,
        escalatedAt DATETIME NULL,
        escalationReason TEXT NULL,
        isEscalated BOOLEAN DEFAULT FALSE,
        originalUserId INT NULL,
        closedAt DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(255) DEFAULT 'General',
        isActive BOOLEAN DEFAULT TRUE,
        attachments JSON NULL,
        createdById INT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await connection.end();
    console.log('✅ All tables created successfully');
  }

  async addBioColumn() {
    console.log('👤 Checking bio column in users table...');
    
    const connection = await this.createConnection({ database: this.dbConfig.name });
    
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bio'
    `, [this.dbConfig.name]);

    if (columns.length === 0) {
      console.log('➕ Adding bio column to users table...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN bio TEXT NULL AFTER avatar
      `);
      console.log('✅ Bio column added successfully');
    } else {
      console.log('✅ Bio column already exists');
    }

    await connection.end();
  }

  async seedSuperAdmin() {
    console.log('👨‍💼 Checking for superadmin user...');
    
    // Get superadmin credentials from environment variables
    const superadminConfig = {
      username: process.env.SUPERADMIN_USERNAME || 'admin',
      name: process.env.SUPERADMIN_NAME || 'System Administrator',
      email: process.env.SUPERADMIN_EMAIL || 'admin@company.com',
      password: process.env.SUPERADMIN_PASSWORD || 'defaultPassword123'
    };
    
    const connection = await this.createConnection({ database: this.dbConfig.name });
    
    const [existingUsers] = await connection.execute(
      `SELECT id FROM users WHERE email = ? OR username = ?`,
      [superadminConfig.email, superadminConfig.username]
    );
    
    if (existingUsers.length === 0) {
      console.log('🔐 Creating superadmin user...');
      
      const hashedPassword = await bcrypt.hash(superadminConfig.password, 10);
      
      await connection.execute(`
        INSERT INTO users (username, name, email, password, role, isSuperAdmin, departmentId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        superadminConfig.username,
        superadminConfig.name,
        superadminConfig.email,
        hashedPassword,
        'superadmin',
        true,
        null
      ]);
      
      console.log('✅ Superadmin user created successfully');
    } else {
      console.log('✅ Superadmin user already exists');
    }

    await connection.end();
  }

  showHelp() {
    console.log(`
KRI KPI Dashboard - Database Administration Utility
═══════════════════════════════════════════════════

Commands:
  setup         Complete database setup (default)
  test          Test database connection
  create-db     Create database only
  set-password  Set MySQL root password to 'netweb'
  help          Show this help

Examples:
  node admin-utils.js
  node admin-utils.js setup
  node admin-utils.js test
  node admin-utils.js create-db
  node admin-utils.js set-password

Environment:
  Current environment: ${process.env.NODE_ENV || 'development'}
  Database host: ${this.dbConfig.host}:${this.dbConfig.port}
  Database name: ${this.dbConfig.name}
  Database user: ${this.dbConfig.user}
`);
  }
}

// Main execution
async function main() {
  const admin = new DatabaseAdmin();
  const command = process.argv[2] || 'setup';

  try {
    switch (command.toLowerCase()) {
      case 'setup':
        await admin.setupComplete();
        break;
      case 'test':
        await admin.testConnection();
        break;
      case 'create-db':
        await admin.createDatabase();
        break;
      case 'set-password':
        await admin.setMySQLPassword();
        break;
      case 'help':
      case '--help':
      case '-h':
        admin.showHelp();
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
        admin.showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseAdmin };