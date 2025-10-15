const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔧 Testing Database Connection...');
  console.log('================================');
  
  // Get environment config
  const isProduction = process.env.NODE_ENV === 'production';
  
  const configs = [
    {
      name: 'Current Environment Config',
      host: isProduction ? (process.env.DB_HOST_PROD || 'localhost') : (process.env.DB_HOST_DEV || '127.0.0.1'),
      port: isProduction ? (process.env.DB_PORT_PROD || 3306) : (process.env.DB_PORT_DEV || 3306),
      user: isProduction ? (process.env.DB_USER_PROD || 'root') : (process.env.DB_USER_DEV || 'root'),
      password: isProduction ? (process.env.DB_PASSWORD_PROD || '') : (process.env.DB_PASSWORD_DEV || ''),
      database: isProduction ? (process.env.DB_NAME_PROD || 'kri_kpi_dashboard') : (process.env.DB_NAME_DEV || 'kri_kpi_dashboard')
    },
    {
      name: 'No Password (XAMPP Default)',
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'kri_kpi_dashboard'
    },
    {
      name: 'With Password 123',
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '123',
      database: 'kri_kpi_dashboard'
    },
    {
      name: 'Localhost No Password',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      database: 'kri_kpi_dashboard'
    },
    {
      name: 'Localhost With Password 123',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '123',
      database: 'kri_kpi_dashboard'
    }
  ];

  for (const config of configs) {
    try {
      console.log(`\n🧪 Testing: ${config.name}`);
      console.log(`   Host: ${config.host}:${config.port}`);
      console.log(`   User: ${config.user}`);
      console.log(`   Password: ${config.password ? '[SET]' : '[EMPTY]'}`);
      console.log(`   Database: ${config.database}`);
      
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        connectTimeout: 5000
      });
      
      console.log(`   ✅ Connection successful!`);
      
      // Test database existence
      try {
        await connection.execute(`USE ${config.database}`);
        console.log(`   ✅ Database '${config.database}' exists and accessible`);
      } catch (dbError) {
        console.log(`   ⚠️  Database '${config.database}' not found. You may need to create it.`);
        console.log(`   💡 Run: CREATE DATABASE ${config.database};`);
      }
      
      await connection.end();
      
      console.log(`\n🎯 WORKING CONFIGURATION FOUND!`);
      console.log(`   Update your .env file with these settings:`);
      console.log(`   DB_HOST_DEV=${config.host}`);
      console.log(`   DB_USER_DEV=${config.user}`);
      console.log(`   DB_PASSWORD_DEV=${config.password}`);
      break;
      
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
    }
  }
}

testDatabaseConnection().catch(console.error);