const DailyTask = require("../models/DailyTask");
const User = require("../models/User");
const Department = require("../models/Department");
const { Op, fn, col, literal } = require("sequelize");

// Helper function to emit real-time updates
const emitTaskUpdate = (req, eventType, data) => {
  const io = req.app.get('io');
  if (io) {
    console.log(`Emitting real-time event: ${eventType}`, { 
      data: data.id || data.id, 
      timestamp: new Date(),
      connectedClients: io.engine.clientsCount 
    });
    
    // Emit specific event type to all connected clients
    io.emit(eventType, data);
    
    // Emit to admin room specifically
    io.to('admin-room').emit(eventType, data);
    
    // Emit stats update to trigger statistics refresh
    io.emit('task-stats-update');
    io.to('admin-room').emit('task-stats-update');
    
    console.log(`Event ${eventType} emitted successfully`);
  } else {
    console.log('Socket.IO not available for emitting events');
  }
};

// Get all daily tasks
const getAllDailyTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, departmentId, userId, dateFrom, dateTo, search } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status) whereClause.status = status;
    if (departmentId) whereClause.departmentId = departmentId;
    if (userId) whereClause.userId = userId;
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.date[Op.lte] = new Date(dateTo);
    }
    
    // Add search functionality
    if (search) {
      whereClause[Op.or] = [
        { task: { [Op.like]: `%${search}%` } },
        { remarks: { [Op.like]: `%${search}%` } },
        { srId: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const offset = (page - 1) * limit;
    
    const { count: total, rows: tasks } = await DailyTask.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching daily tasks:", error);
    res.status(500).json({ error: "Failed to fetch daily tasks" });
  }
};

// Get daily task by ID
const getDailyTaskById = async (req, res) => {
  try {
    const task = await DailyTask.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching daily task:", error);
    res.status(500).json({ error: "Failed to fetch daily task" });
  }
};

// Get daily tasks by user
const getDailyTasksByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    
    const whereClause = { userId: userId };
    
    if (status) whereClause.status = status;
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.date[Op.lte] = new Date(dateTo);
    }
    
    const offset = (page - 1) * limit;
    
    const { count: total, rows: tasks } = await DailyTask.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching user daily tasks:", error);
    res.status(500).json({ error: "Failed to fetch user daily tasks" });
  }
};

// Create new daily task
const createDailyTask = async (req, res) => {
  try {
    const {
      task,
      srId,
      remarks,
      status = "in-progress",
      date,
      tags = [],
    } = req.body;

    // Validate required fields
    if (!task || !remarks) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user info from the authenticated user
    const currentUser = await User.findByPk(req.user.id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    
    if (!currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    // Use the current user's department ID
    let departmentId = currentUser.departmentId;
    
    // Debug logging
    console.log("Current user:", {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      departmentId: departmentId
    });
    
    // Validate that user has a department (required for non-superadmin users)
    if (!departmentId && currentUser.role !== "superadmin") {
      return res.status(400).json({ error: "User must be assigned to a department to create daily tasks" });
    }
    
    // For superadmin users, we need to handle the case where they might not have a department
    if (!departmentId && currentUser.role === "superadmin") {
      // Try to get the first available department
      const defaultDept = await Department.findOne();
      if (!defaultDept) {
        return res.status(400).json({ error: "No departments available. Please create a department first." });
      }
      departmentId = defaultDept.id;
    }

    // Create new daily task
    const taskData = {
      task,
      srId,
      remarks,
      status,
      date: date ? new Date(date) : new Date(),
      userId: req.user.id, // Use the authenticated user's ID
      departmentId, // Use the current user's department
      tags: Array.isArray(tags) ? tags : [],
      createdById: req.user.id,
      originalUserId: req.user.id, // Set original user for escalation tracking
    };
    
    console.log("Creating task with data:", taskData);
    
    const newTask = await DailyTask.create(taskData);
    
    // Fetch the created task with associations
    const populatedTask = await DailyTask.findByPk(newTask.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit real-time update
    emitTaskUpdate(req, 'new-task', populatedTask);

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error("Error creating daily task:", error);
    res.status(500).json({ error: "Failed to create daily task", details: error.message });
  }
};

// Update daily task
const updateDailyTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const [updatedCount] = await DailyTask.update(updateData, {
      where: { id }
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    const updatedTask = await DailyTask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit real-time update
    emitTaskUpdate(req, 'task-updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating daily task:", error);
    res.status(500).json({ error: "Failed to update daily task" });
  }
};

// Delete daily task
const deleteDailyTask = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCount = await DailyTask.destroy({ where: { id } });

    if (deletedCount === 0) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    // Emit real-time update
    emitTaskUpdate(req, 'task-deleted', { id });

    res.json({ message: "Daily task deleted successfully" });
  } catch (error) {
    console.error("Error deleting daily task:", error);
    res.status(500).json({ error: "Failed to delete daily task" });
  }
};

// Update daily task status
const updateDailyTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["in-progress", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Prepare update object
    let updateData = { status };
    if (status === "closed") {
      updateData.closedAt = new Date();
    } else if (status === "in-progress") {
      updateData.closedAt = null;
    }

    const [updatedCount] = await DailyTask.update(updateData, {
      where: { id }
    });

    if (updatedCount === 0) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    const updatedTask = await DailyTask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit real-time update
    emitTaskUpdate(req, 'task-status-updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating daily task status:", error);
    res.status(500).json({ error: "Failed to update daily task status" });
  }
};

// Escalate task to another user
const escalateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalatedToId, escalationReason } = req.body;

    // Validate required fields
    if (!escalatedToId) {
      return res.status(400).json({ error: "escalatedToId is required" });
    }

    // Validate that the escalatedTo user exists
    const escalatedToUser = await User.findByPk(escalatedToId);
    if (!escalatedToUser) {
      return res.status(400).json({ error: "Escalated to user not found" });
    }

    // Get the current task
    const currentTask = await DailyTask.findByPk(id);
    if (!currentTask) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    // Update task with escalation information
    const updateData = {
      escalatedToId,
      escalatedById: req.user.id,
      escalatedAt: new Date(),
      escalationReason: escalationReason || 'No reason provided',
      isEscalated: true,
      // Set originalUserId if not already set
      originalUserId: currentTask.originalUserId || currentTask.userId,
      // Transfer task ownership
      userId: escalatedToId
    };

    await DailyTask.update(updateData, { where: { id } });

    // Fetch updated task with all associations
    const escalatedTask = await DailyTask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      // Notify the escalated user
      io.to(`user-${escalatedToId}`).emit('task-escalated-to-you', escalatedTask);
      // Notify admin room
      io.to('admin-room').emit('task-escalated', escalatedTask);
      // General task update
      emitTaskUpdate(req, 'task-escalated', escalatedTask);
    }

    res.json(escalatedTask);
  } catch (error) {
    console.error("Error escalating task:", error);
    res.status(500).json({ error: "Failed to escalate task" });
  }
};

// Get escalated tasks for a user
const getEscalatedTasks = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    
    const whereClause = { 
      escalatedToId: userId,
      isEscalated: true 
    };
    
    if (status) whereClause.status = status;
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.date[Op.lte] = new Date(dateTo);
    }
    
    const offset = (page - 1) * limit;
    
    const { count: total, rows: tasks } = await DailyTask.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['escalatedAt', 'DESC'], ['date', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Debug logging
    console.log("Escalated tasks data:", JSON.stringify(tasks, null, 2));

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching escalated tasks:", error);
    res.status(500).json({ error: "Failed to fetch escalated tasks" });
  }
};

// Get tasks that were escalated by a user
const getTasksEscalatedByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    
    const whereClause = { 
      escalatedById: userId,
      isEscalated: true 
    };
    
    if (status) whereClause.status = status;
    
    if (dateFrom || dateTo) {
      whereClause.date = {};
      if (dateFrom) whereClause.date[Op.gte] = new Date(dateFrom);
      if (dateTo) whereClause.date[Op.lte] = new Date(dateTo);
    }
    
    const offset = (page - 1) * limit;
    
    const { count: total, rows: tasks } = await DailyTask.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['escalatedAt', 'DESC'], ['date', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("Error fetching tasks escalated by user:", error);
    res.status(500).json({ error: "Failed to fetch tasks escalated by user" });
  }
};

// Get KPI data for a specific user
const getUserKPIData = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month, dateFrom, dateTo } = req.query;
    
    let whereClause = { userId: userId };
    
    // Add date filters
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      whereClause.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (dateFrom && dateTo) {
      whereClause.date = {
        [Op.gte]: new Date(dateFrom),
        [Op.lte]: new Date(dateTo)
      };
    }

    // Get task statistics
    const totalTasks = await DailyTask.count({ where: whereClause });
    
    const completedTasks = await DailyTask.count({
      where: { ...whereClause, status: 'closed' }
    });
    
    const pendingTasks = await DailyTask.count({
      where: { ...whereClause, status: 'in-progress' }
    });

    // Get escalation data
    const escalatedTasks = await DailyTask.count({
      where: { ...whereClause, isEscalated: true }
    });

    const tasksEscalatedByUser = await DailyTask.count({
      where: { escalatedById: userId, isEscalated: true }
    });

    // Calculate performance metrics
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
    const escalationRate = totalTasks > 0 ? ((escalatedTasks / totalTasks) * 100).toFixed(2) : 0;

    res.json({
      userId,
      period: { year, month, dateFrom, dateTo },
      metrics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        escalatedTasks,
        tasksEscalatedByUser,
        completionRate: parseFloat(completionRate),
        escalationRate: parseFloat(escalationRate),
      }
    });

  } catch (error) {
    console.error("Error fetching user KPI data:", error);
    res.status(500).json({ error: "Failed to fetch user KPI data" });
  }
};

// Get overall KPI data for dashboard
const getOverallKPIData = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let whereClause = {};
    
    // Add date filters
    if (dateFrom && dateTo) {
      whereClause.date = {
        [Op.gte]: new Date(dateFrom),
        [Op.lte]: new Date(dateTo)
      };
    }

    // Get overall statistics
    const totalTasks = await DailyTask.count({ where: whereClause });
    
    const completedTasks = await DailyTask.count({
      where: { ...whereClause, status: 'closed' }
    });
    
    const pendingTasks = await DailyTask.count({
      where: { ...whereClause, status: 'in-progress' }
    });

    const escalatedTasks = await DailyTask.count({
      where: { ...whereClause, isEscalated: true }
    });

    // Get department-wise statistics
    const departmentStats = await DailyTask.findAll({
      where: whereClause,
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }],
      attributes: [
        'departmentId',
        [fn('COUNT', col('DailyTask.id')), 'totalTasks'],
        [fn('SUM', literal("CASE WHEN status = 'closed' THEN 1 ELSE 0 END")), 'completedTasks'],
        [fn('SUM', literal("CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END")), 'pendingTasks'],
        [fn('SUM', literal("CASE WHEN isEscalated = 1 THEN 1 ELSE 0 END")), 'escalatedTasks'],
      ],
      group: ['departmentId', 'department.id', 'department.name']
    });

    // Calculate overall performance metrics
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
    const escalationRate = totalTasks > 0 ? ((escalatedTasks / totalTasks) * 100).toFixed(2) : 0;

    res.json({
      period: { dateFrom, dateTo },
      overall: {
        totalTasks,
        completedTasks,
        pendingTasks,
        escalatedTasks,
        completionRate: parseFloat(completionRate),
        escalationRate: parseFloat(escalationRate),
      },
      byDepartment: departmentStats
    });

  } catch (error) {
    console.error("Error fetching overall KPI data:", error);
    res.status(500).json({ error: "Failed to fetch overall KPI data" });
  }
};

// Get daily task statistics
const getDailyTaskStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let whereClause = {};
    
    // Add date filters
    if (dateFrom && dateTo) {
      whereClause.date = {
        [Op.gte]: new Date(dateFrom),
        [Op.lte]: new Date(dateTo)
      };
    }

    // Get overall statistics
    const totalTasks = await DailyTask.count({ where: whereClause });
    
    const completedTasks = await DailyTask.count({
      where: { ...whereClause, status: 'closed' }
    });
    
    const pendingTasks = await DailyTask.count({
      where: { ...whereClause, status: 'in-progress' }
    });

    const escalatedTasks = await DailyTask.count({
      where: { ...whereClause, isEscalated: true }
    });

    // Get status distribution
    const statusStats = await DailyTask.findAll({
      where: whereClause,
      attributes: [
        'status',
        [fn('COUNT', col('DailyTask.id')), 'count']
      ],
      group: ['status']
    });

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
    const escalationRate = totalTasks > 0 ? ((escalatedTasks / totalTasks) * 100).toFixed(2) : 0;

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      escalatedTasks,
      completionRate: parseFloat(completionRate),
      escalationRate: parseFloat(escalationRate),
      statusDistribution: statusStats.map(stat => ({
        status: stat.status,
        count: parseInt(stat.dataValues.count)
      }))
    });

  } catch (error) {
    console.error("Error fetching daily task stats:", error);
    res.status(500).json({ error: "Failed to fetch daily task statistics" });
  }
};

// Get KPI data for all users
const getAllUsersKPIData = async (req, res) => {
  try {
    const { year, month, dateFrom, dateTo } = req.query;
    
    let whereClause = {};
    
    // Add date filters
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      whereClause.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      whereClause.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (dateFrom && dateTo) {
      whereClause.date = {
        [Op.gte]: new Date(dateFrom),
        [Op.lte]: new Date(dateTo)
      };
    }

    console.log('KPI Query filters:', { year, month, dateFrom, dateTo, whereClause });

    // Get user-wise statistics with department info
    const userStats = await DailyTask.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          include: [{
            model: Department,
            as: 'department',
            attributes: ['id', 'name']
          }]
        }
      ],
      attributes: [
        'userId',
        [fn('COUNT', col('DailyTask.id')), 'total'],
        [fn('SUM', literal("CASE WHEN status = 'closed' THEN 1 ELSE 0 END")), 'closed'],
        [fn('SUM', literal("CASE WHEN status = 'open' THEN 1 ELSE 0 END")), 'open'],
        [fn('SUM', literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'pending'],
        [fn('SUM', literal("CASE WHEN isEscalated = 1 THEN 1 ELSE 0 END")), 'escalated'],
      ],
      group: ['userId', 'user.id', 'user.name', 'user.email', 'user.department.id', 'user.department.name']
    });

    console.log('Raw user stats:', JSON.stringify(userStats, null, 2));

    // Format the data to match frontend expectations
    const formattedStats = userStats.map(stat => {
      const total = parseInt(stat.dataValues.total) || 0;
      const closed = parseInt(stat.dataValues.closed) || 0;
      const open = parseInt(stat.dataValues.open) || 0;
      const pending = parseInt(stat.dataValues.pending) || 0;
      const escalated = parseInt(stat.dataValues.escalated) || 0;
      
      const completionRate = total > 0 ? parseFloat(((closed / total) * 100).toFixed(2)) : 0;
      const penalizedRate = total > 0 ? parseFloat((((closed - escalated) / total) * 100).toFixed(2)) : 0;
      
      return {
        userId: stat.userId,
        userName: stat.user?.name || 'Unknown User',
        userEmail: stat.user?.email || 'No email',
        department: stat.user?.department?.name || 'N/A',
        total,
        closed,
        open,
        pending,
        escalated,
        completionRate,
        penalizedRate
      };
    });

    console.log('Formatted KPI stats:', formattedStats);
    res.json(formattedStats);

  } catch (error) {
    console.error("Error fetching all users KPI data:", error);
    res.status(500).json({ error: "Failed to fetch all users KPI data" });
  }
};

// Rollback escalated task
const rollbackTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Get the current task
    const currentTask = await DailyTask.findByPk(id);
    if (!currentTask) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    if (!currentTask.isEscalated || !currentTask.originalUserId) {
      return res.status(400).json({ error: "Task is not escalated or has no original user" });
    }

    // Rollback the escalation
    const updateData = {
      escalatedToId: null,
      escalatedById: null,
      escalatedAt: null,
      escalationReason: '',
      isEscalated: false,
      // Restore original user
      userId: currentTask.originalUserId,
      originalUserId: null
    };

    await DailyTask.update(updateData, { where: { id } });

    // Fetch updated task with all associations
    const rolledBackTask = await DailyTask.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedTo',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'escalatedBy',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'originalUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      // Notify the original user
      io.to(`user-${currentTask.originalUserId}`).emit('task-rolled-back-to-you', rolledBackTask);
      // Notify admin room
      io.to('admin-room').emit('task-rolled-back', rolledBackTask);
      // General task update
      emitTaskUpdate(req, 'task-rolled-back', rolledBackTask);
    }

    res.json(rolledBackTask);
  } catch (error) {
    console.error("Error rolling back task:", error);
    res.status(500).json({ error: "Failed to rollback task" });
  }
};

module.exports = {
  getAllDailyTasks,
  getDailyTaskById,
  getDailyTasksByUser,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  updateDailyTaskStatus,
  getDailyTaskStats,
  getUserKPIData,
  getAllUsersKPIData,
  escalateTask,
  rollbackTask,
  getEscalatedTasks,
  getTasksEscalatedByUser,
  getOverallKPIData,
};