const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DailyTask = sequelize.define('DailyTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  task: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  srId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  status: {
    type: DataTypes.ENUM('in-progress', 'closed'),
    allowNull: false,
    defaultValue: 'in-progress',
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
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
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  // Escalation fields
  escalatedToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  escalatedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  escalatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  escalationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  isEscalated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  originalUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'daily_tasks',
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'date']
    },
    {
      fields: ['departmentId', 'date']
    },
    {
      fields: ['status', 'date']
    },
    {
      fields: ['srId']
    },
    {
      fields: ['escalatedToId', 'isEscalated']
    },
    {
      fields: ['originalUserId', 'isEscalated']
    },
    {
      fields: ['createdById']
    }
  ]
});

module.exports = DailyTask;
