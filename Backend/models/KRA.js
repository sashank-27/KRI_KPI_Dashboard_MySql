const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const KRA = sequelize.define('KRA', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  responsibilityAreas: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: true,
      isValidArray(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Responsibility areas must be a non-empty array');
        }
        for (const area of value) {
          if (typeof area !== 'string' || !area.trim()) {
            throw new Error('Each responsibility area must be a non-empty string');
          }
        }
      },
    },
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  assignedToId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled', 'on-hold'),
    allowNull: false,
    defaultValue: 'active',
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'kras',
  timestamps: true,
  indexes: [
    {
      fields: ['assignedToId', 'status']
    },
    {
      fields: ['departmentId', 'status']
    },
    {
      fields: ['createdById']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = KRA;
