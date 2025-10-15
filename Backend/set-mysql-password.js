const mysql = require('mysql2/promise');

async function setMySQLPassword() {
  console.log('🔐 Setting MySQL Root Password to "netweb"...');
  console.log('============================================');
  
  // Try different connection methods to find the working one
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
    },
    {
      name: 'Localhost no password',
      config: { host: 'localhost', port: 3306, user: 'root', password: '' }
    },
    {
      name: 'Localhost with password 123',
      config: { host: 'localhost', port: 3306, user: 'root', password: '123' }
    }
  ];

  let connection = null;
  let workingConfig = null;

  // Find working connection
  for (const attempt of connectionAttempts) {
    try {
      console.log(`\n🧪 Trying: ${attempt.name}`);
      connection = await mysql.createConnection(attempt.config);
      console.log(`✅ Connected successfully!`);
      workingConfig = attempt.config;
      break;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
  }

  if (!connection) {
    console.log('\n❌ Could not connect to MySQL with any configuration.');
    console.log('💡 Please ensure MySQL is running and check your XAMPP control panel.');
    return;
  }

  try {
    // Set the password for root user
    console.log('\n🔧 Setting password for root user...');
    
    // Try different password setting methods
    const passwordCommands = [
      "ALTER USER 'root'@'localhost' IDENTIFIED BY 'netweb'",
      "ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY 'netweb'", 
      "ALTER USER 'root'@'%' IDENTIFIED BY 'netweb'",
      "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('netweb')",
      "SET PASSWORD FOR 'root'@'127.0.0.1' = PASSWORD('netweb')"
    ];

    for (const command of passwordCommands) {
      try {
        console.log(`🔧 Executing: ${command}`);
        await connection.execute(command);
        console.log(`✅ Success!`);
      } catch (error) {
        console.log(`⚠️  ${error.message}`);
      }
    }

    // Flush privileges
    console.log('\n🔄 Flushing privileges...');
    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ Privileges flushed!');

    await connection.end();

    console.log('\n🎉 Password setup complete!');
    console.log('💡 Try starting your application now with: npm run dev');

  } catch (error) {
    console.error('❌ Error setting password:', error.message);
    if (connection) await connection.end();
  }
}

setMySQLPassword().catch(console.error);