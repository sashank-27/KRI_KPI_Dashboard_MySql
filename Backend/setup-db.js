const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without specifying a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'kri_kpi_dashboard';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' created or already exists`);

    await connection.execute(`USE \`${dbName}\``);
    console.log(`✅ Using database '${dbName}'`);

    console.log('🎉 Database setup completed successfully!');
    console.log('You can now start the application with: npm run dev');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Tips to fix this error:');
      console.log('1. Make sure WAMP/XAMPP MySQL service is running');
      console.log('2. Check your MySQL username and password in .env file');
      console.log('3. Try using "root" as username with empty password for local development');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Tips to fix this error:');
      console.log('1. Make sure WAMP/XAMPP is running');
      console.log('2. Check if MySQL is running on port 3306');
      console.log('3. Verify MySQL service is started');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();