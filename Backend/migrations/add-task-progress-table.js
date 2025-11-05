const { sequelize } = require('../config/db');

async function migrateTaskProgress() {
  try {
    console.log('🔧 Starting task_progress table migration...');
    
    // Check if table exists
    const [tables] = await sequelize.query(
      "SHOW TABLES LIKE 'task_progress';"
    );
    
    if (tables.length > 0) {
      console.log('ℹ️  task_progress table already exists, checking structure...');
      
      // Get current table structure
      const [columns] = await sequelize.query('DESCRIBE task_progress;');
      const columnNames = columns.map(col => col.Field);
      
      // Expected columns
      const expectedColumns = ['id', 'taskId', 'date', 'progressDescription', 'userId', 'createdAt', 'updatedAt'];
      const hasAllColumns = expectedColumns.every(col => columnNames.includes(col));
      
      if (hasAllColumns) {
        console.log('✅ task_progress table structure is correct, skipping migration');
        return;
      } else {
        console.log('⚠️  Table structure is incorrect, recreating...');
        await sequelize.query('DROP TABLE IF EXISTS `task_progress`;');
        console.log('✅ Dropped existing task_progress table');
      }
    } else {
      console.log('ℹ️  task_progress table does not exist, creating...');
    }
    
    // Create the table with correct schema
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`task_progress\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`taskId\` int NOT NULL,
        \`date\` date NOT NULL,
        \`progressDescription\` text NOT NULL,
        \`userId\` int NOT NULL,
        \`createdAt\` datetime NOT NULL,
        \`updatedAt\` datetime NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`taskId\` (\`taskId\`,\`date\`),
        KEY \`userId\` (\`userId\`),
        CONSTRAINT \`task_progress_ibfk_1\` FOREIGN KEY (\`taskId\`) REFERENCES \`daily_tasks\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`task_progress_ibfk_2\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log('✅ Created task_progress table with correct schema');
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

module.exports = { migrateTaskProgress };

// Run if called directly
if (require.main === module) {
  const { connectDB } = require('../config/db');
  connectDB().then(async () => {
    await migrateTaskProgress();
    process.exit(0);
  }).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });
}
