const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FAQ = sequelize.define('FAQ', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Problem description (question)
  problem: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  // SR-ID from the task
  srId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  // Task reference
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'daily_tasks',
      key: 'id',
    },
  },
  // Solution file details
  solutionFile: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidSolutionFile(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Solution file must be an object');
        }
        const required = ['filename', 'originalName', 'path', 'mimetype', 'size'];
        for (const field of required) {
          if (!value[field]) {
            throw new Error(`Solution file must contain ${field}`);
          }
        }
      },
    },
  },
  // User who solved the problem
  solvedById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  // Department reference
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  // Tags for better searching
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  // Active status
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'faqs',
  timestamps: true,
  indexes: [
    {
      fields: ['srId']
    },
    {
      fields: ['solvedById']
    },
    {
      fields: ['departmentId']
    },
    {
      fields: ['isActive', 'createdAt']
    },
    {
      fields: ['taskId']
    }
  ]
});

module.exports = FAQ;
