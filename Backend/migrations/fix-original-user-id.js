/**
 * Migration: Fix originalUserId for non-escalated tasks
 * 
 * Problem: Old code was setting originalUserId = userId on task creation
 * This breaks KPI calculations because it thinks all tasks were escalated
 * 
 * Solution: Set originalUserId to NULL for non-escalated tasks
 * Only escalated tasks (isEscalated = true) should have originalUserId set
 */

const { sequelize } = require('../config/db');

async function fixOriginalUserId() {
  try {
    console.log('Starting originalUserId fix migration...');

    // Update all non-escalated tasks where originalUserId equals userId
    // These tasks were never escalated, so originalUserId should be NULL
    const [results] = await sequelize.query(`
      UPDATE daily_tasks 
      SET originalUserId = NULL 
      WHERE isEscalated = 0 
      AND originalUserId = userId
    `);

    console.log(`✅ Fixed ${results.affectedRows} tasks where originalUserId incorrectly matched userId`);

    // Verify the fix
    const verification = await sequelize.query(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN isEscalated = 1 THEN 1 ELSE 0 END) as escalated_tasks,
        SUM(CASE WHEN originalUserId IS NOT NULL THEN 1 ELSE 0 END) as tasks_with_original_user,
        SUM(CASE WHEN isEscalated = 0 AND originalUserId IS NOT NULL THEN 1 ELSE 0 END) as problematic_tasks
      FROM daily_tasks
    `, { type: sequelize.QueryTypes.SELECT });

    const stats = verification[0];
    console.log('\nVerification results:');
    console.log('- Total tasks:', stats.total_tasks);
    console.log('- Escalated tasks:', stats.escalated_tasks);
    console.log('- Tasks with originalUserId:', stats.tasks_with_original_user);
    console.log('- Problematic (non-escalated but has originalUserId):', stats.problematic_tasks);

    if (parseInt(stats.problematic_tasks) > 0) {
      console.warn('\n⚠️  Warning: Still found problematic tasks. Manual review recommended.');
    } else {
      console.log('\n✅ All data looks correct!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixOriginalUserId();
