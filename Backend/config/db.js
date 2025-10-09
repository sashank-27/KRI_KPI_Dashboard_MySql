const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'kri_kpi_dashboard',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // Disabled SQL query logging
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: false,
      paranoid: false,
    },
    timezone: '+00:00', // Store dates in UTC
  }
);

// Test the connection
async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL database connected successfully.');
    
    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: false }); // Set to true for development only
    console.log('✅ Database tables synchronized.');
    
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL database:', error.message);
    throw error;
  }
}

module.exports = { sequelize, connectDB };
