const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  console.log('🗄️  Creating Database...');
  console.log('========================');
  
  try {
    // Connect without specifying database
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '' // No password for XAMPP default
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS kri_kpi_dashboard');
    console.log('✅ Database "kri_kpi_dashboard" created/verified');
    
    // Use the database
    await connection.query('USE kri_kpi_dashboard');
    console.log('✅ Switched to database "kri_kpi_dashboard"');
    
    // Check if database has any tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 Database has ${tables.length} tables`);
    
    if (tables.length === 0) {
      console.log('💡 Database is empty. The application will create tables automatically on first run.');
    } else {
      console.log('📋 Existing tables:');
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${Object.values(table)[0]}`);
      });
    }
    
    await connection.end();
    console.log('✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

createDatabase();