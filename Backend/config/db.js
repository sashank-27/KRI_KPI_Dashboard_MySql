const { Sequelize } = require('sequelize');
require('dotenv').config();

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Get environment-specific configuration
const getDbConfig = () => {
  if (isProduction) {
    return {
      host: process.env.DB_HOST_PROD || 'localhost',
      port: process.env.DB_PORT_PROD || 3306,
      name: process.env.DB_NAME_PROD || 'kri_kpi_dashboard',
      user: process.env.DB_USER_PROD || 'root',
      password: process.env.DB_PASSWORD_PROD !== undefined ? process.env.DB_PASSWORD_PROD : 'netweb',
      jwtSecret: process.env.JWT_SECRET_PROD || 'secretkey'
    };
  } else {
    return {
      host: process.env.DB_HOST_DEV || '127.0.0.1',
      port: process.env.DB_PORT_DEV || 3306,
      name: process.env.DB_NAME_DEV || 'kri_kpi_dashboard',
      user: process.env.DB_USER_DEV || 'root',
      password: process.env.DB_PASSWORD_DEV !== undefined ? process.env.DB_PASSWORD_DEV : 'netweb',
      jwtSecret: process.env.JWT_SECRET_DEV || 'secretkey'
    };
  }
};

const dbConfig = getDbConfig();

// Database configuration
const sequelizeConfig = {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: 'mysql',
  logging: false, // Disable SQL query logging
  pool: {
    max: isProduction ? 20 : 10,
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
};

// Add SSL configuration for production if needed
if (isProduction && process.env.DB_SSL === 'true') {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.name,
  dbConfig.user,
  dbConfig.password,
  sequelizeConfig
);

// Test the connection
async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log(`✅ MySQL database connected successfully to ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🗄️  Database: ${dbConfig.name} | User: ${dbConfig.user} | Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Sync all models (create tables if they don't exist)
    // In production, consider using migrations instead of sync
    const shouldSync = !isProduction || process.env.FORCE_DB_SYNC === 'true';
    
    if (shouldSync) {
      await sequelize.sync({ alter: false }); // Set to true for development only
      console.log('✅ Database tables synchronized.');
    } else {
      console.log('ℹ️  Skipping database sync in production. Use migrations for schema changes.');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL database:', error.message);
    console.error('🔧 Check your database configuration in .env file:');
    console.error(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.error(`   DB_HOST: ${dbConfig.host}`);
    console.error(`   DB_PORT: ${dbConfig.port}`);
    console.error(`   DB_NAME: ${dbConfig.name}`);
    console.error(`   DB_USER: ${dbConfig.user}`);
    console.error(`   DB_PASSWORD: ${dbConfig.password ? '[SET]' : '[NOT SET]'}`);
    throw error;
  }
}

// Helper function to get JWT secret based on environment
const getJwtSecret = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return process.env.JWT_SECRET_PROD || 'secretkey';
  } else {
    return process.env.JWT_SECRET_DEV || 'secretkey';
  }
};

module.exports = { sequelize, connectDB, getDbConfig, getJwtSecret };
