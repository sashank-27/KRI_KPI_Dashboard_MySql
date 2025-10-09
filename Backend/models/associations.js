const User = require('./User');
const Department = require('./Department');
const KRA = require('./KRA');
const DailyTask = require('./DailyTask');
const FAQ = require('./FAQ');

// Define associations
function setupAssociations() {
  // User - Department associations
  User.belongsTo(Department, {
    foreignKey: 'departmentId',
    as: 'department',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  Department.hasMany(User, {
    foreignKey: 'departmentId',
    as: 'users'
  });

  // User - User (self-referencing for createdBy)
  User.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  User.hasMany(User, {
    foreignKey: 'createdById',
    as: 'createdUsers'
  });

  // KRA associations
  KRA.belongsTo(Department, {
    foreignKey: 'departmentId',
    as: 'department',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  Department.hasMany(KRA, {
    foreignKey: 'departmentId',
    as: 'kras'
  });

  KRA.belongsTo(User, {
    foreignKey: 'assignedToId',
    as: 'assignedTo',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  User.hasMany(KRA, {
    foreignKey: 'assignedToId',
    as: 'assignedKras'
  });

  KRA.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  User.hasMany(KRA, {
    foreignKey: 'createdById',
    as: 'createdKras'
  });

  // DailyTask associations
  DailyTask.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  User.hasMany(DailyTask, {
    foreignKey: 'userId',
    as: 'dailyTasks'
  });

  DailyTask.belongsTo(Department, {
    foreignKey: 'departmentId',
    as: 'department',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  Department.hasMany(DailyTask, {
    foreignKey: 'departmentId',
    as: 'dailyTasks'
  });

  DailyTask.belongsTo(User, {
    foreignKey: 'createdById',
    as: 'createdBy',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  User.hasMany(DailyTask, {
    foreignKey: 'createdById',
    as: 'createdTasks'
  });

  // DailyTask escalation associations
  DailyTask.belongsTo(User, {
    foreignKey: 'escalatedToId',
    as: 'escalatedTo',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  User.hasMany(DailyTask, {
    foreignKey: 'escalatedToId',
    as: 'escalatedTasks'
  });

  DailyTask.belongsTo(User, {
    foreignKey: 'escalatedById',
    as: 'escalatedBy',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  User.hasMany(DailyTask, {
    foreignKey: 'escalatedById',
    as: 'escalatedByTasks'
  });

  DailyTask.belongsTo(User, {
    foreignKey: 'originalUserId',
    as: 'originalUser',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  User.hasMany(DailyTask, {
    foreignKey: 'originalUserId',
    as: 'originalTasks'
  });

  // FAQ associations
  FAQ.belongsTo(DailyTask, {
    foreignKey: 'taskId',
    as: 'task',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  DailyTask.hasMany(FAQ, {
    foreignKey: 'taskId',
    as: 'faqs'
  });

  FAQ.belongsTo(User, {
    foreignKey: 'solvedById',
    as: 'solvedBy',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  User.hasMany(FAQ, {
    foreignKey: 'solvedById',
    as: 'solvedFaqs'
  });

  FAQ.belongsTo(Department, {
    foreignKey: 'departmentId',
    as: 'department',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  });
  Department.hasMany(FAQ, {
    foreignKey: 'departmentId',
    as: 'faqs'
  });

  console.log('✅ Database associations setup completed');
}

module.exports = { setupAssociations };