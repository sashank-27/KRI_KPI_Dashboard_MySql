const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskProgress = sequelize.define('TaskProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'daily_tasks',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  progressDescription: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'task_progress',
  timestamps: true,
  indexes: [
    {
      fields: ['taskId', 'date']
    },
    {
      fields: ['userId']
    }
  ]
});

module.exports = TaskProgress;
