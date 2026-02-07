const DailyTask = require("../models/DailyTask");
const User = require("../models/User");
const Department = require("../models/Department");
const FAQ = require("../models/FAQ");
const TaskProgress = require("../models/TaskProgress");
const { Op, fn, col, literal } = require("sequelize");

// Helper function to emit real-time updates
const emitTaskUpdate = (req, eventType, data) => {
  const io = req.app.get('io');
  if (io) {
    console.log(`🔔 Emitting socket event: ${eventType}`);
    
    // Emit specific event type to all connected clients
    io.emit(eventType, data);
    
    // Emit to admin room specifically
    io.to('admin-room').emit(eventType, data);
    
    // If there's a user associated with the task, emit to their room
    if (data && data.userId) {
      io.to(`user-${data.userId}`).emit(eventType, data);
    }
    
    // If task is escalated, notify the escalated user
    if (data && data.escalatedToId) {
      io.to(`user-${data.escalatedToId}`).emit(eventType, data);
      io.to(`user-${data.escalatedToId}`).emit('task-escalated-to-you', data);
    }
    
    // Emit stats update to trigger statistics refresh
    io.emit('task-stats-update', { timestamp: new Date() });
    io.to('admin-room').emit('task-stats-update', { timestamp: new Date() });
    
    console.log(`✅ Socket event emitted successfully: ${eventType}`);
  } else {
    console.warn(`⚠️  Socket.IO not available for event: ${eventType}`);
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
        { srId: { [Op.like]: `%${search}%` } },
        { clientDetails: { [Op.like]: `%${search}%` } }
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
    
    // Build where clause to include:
    // 1. Tasks currently assigned to user (userId = currentUser)
    // 2. Tasks escalated away but user was original owner (originalUserId = currentUser AND isEscalated = true)
    const whereClause = {
      [Op.or]: [
        { userId: userId }, // Currently assigned tasks
        { 
          originalUserId: userId, // Tasks escalated away
          isEscalated: true 
        }
      ]
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
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Add userRole field to each task to indicate user's permission level
    const tasksWithRole = tasks.map(task => {
      const taskData = task.toJSON();
      // Determine user's role for this task
      if (task.userId === parseInt(userId)) {
        taskData.userRole = 'owner'; // Current assignee - full control
      } else if (task.originalUserId === parseInt(userId) && task.isEscalated) {
        taskData.userRole = 'observer'; // Original user watching escalated task - read-only
      } else {
        taskData.userRole = 'viewer'; // Default
      }
      return taskData;
    });

    res.json({
      tasks: tasksWithRole,
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
      clientDetails,
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
      srId: srId ? srId.toUpperCase().trim() : null, // Normalize SR-ID to uppercase
      remarks,
      status,
      date: date ? new Date(date) : new Date(),
      userId: req.user.id, // Use the authenticated user's ID
      departmentId, // Use the current user's department
      tags: Array.isArray(tags) ? tags : [],
      createdById: req.user.id,
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

    // Normalize SR-ID to uppercase if provided
    if (updateData.srId) {
      updateData.srId = updateData.srId.toUpperCase().trim();
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    // Get current user info
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    // Date validation for non-admin users (only if date is being updated)
    if (updateData.date && currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      const taskDate = new Date(updateData.date);
      const today = new Date();
      
      // Reset time to midnight for comparison
      taskDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      if (taskDate.getTime() !== today.getTime()) {
        return res.status(403).json({ 
          error: "Permission denied", 
          message: "Regular users can only update tasks to today's date. Please contact an admin to modify past or future dates." 
        });
      }
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

    // Get the current task to check if it has an FAQ
    const currentTask = await DailyTask.findByPk(id);
    if (!currentTask) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    // Prepare update object
    let updateData = { status };
    if (status === "closed") {
      updateData.closedAt = new Date();
    } else if (status === "in-progress") {
      updateData.closedAt = null;
      
      // If reopening a task, check if it has an associated FAQ and reactivate it
      if (currentTask.status === "closed" && currentTask.srId) {
        const existingFAQ = await FAQ.findOne({
          where: { 
            taskId: id,
            srId: currentTask.srId 
          }
        });
        
        if (existingFAQ) {
          // Reactivate the FAQ
          await FAQ.update(
            { isActive: true },
            { where: { id: existingFAQ.id } }
          );
        }
      }
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
    
    // Build date filter (use UTC for timezone consistency)
    let dateFilter = {};
    if (year && month) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (year) {
      const startDate = new Date(Date.UTC(year, 0, 1));
      const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (dateFrom && dateTo) {
      dateFilter = {
        [Op.gte]: new Date(dateFrom),
        [Op.lte]: new Date(dateTo)
      };
    }

    // 1. Get all tasks assigned to this user (including those they originally owned)
    const allUserTasks = await DailyTask.findAll({
      where: {
        [Op.or]: [
          { userId: userId },
          { originalUserId: userId }
        ],
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      attributes: ['id', 'srId', 'status', 'isEscalated', 'userId', 'originalUserId']
    });

    const total = allUserTasks.length;

    // 2. Direct completions (not escalated, completed by this user)
    const directCompletedTasks = allUserTasks.filter(task => 
      task.userId === parseInt(userId) && 
      task.status === 'closed' && 
      !task.isEscalated
    );
    const directCompleted = directCompletedTasks.length;
    const directCredits = directCompleted * 1.0;

    // 3. Escalated away (original owner was this user, escalated and completed by someone else)
    const escalatedAwayTasks = allUserTasks.filter(task =>
      task.originalUserId === parseInt(userId) &&
      task.userId !== parseInt(userId) &&
      task.isEscalated === true &&
      task.status === 'closed'
    );
    const escalatedAway = escalatedAwayTasks.length;
    const escalatedAwayCredits = escalatedAway * 0.5;

    // 4. Received escalated (received from another user and completed)
    const receivedEscalatedTasks = allUserTasks.filter(task =>
      task.userId === parseInt(userId) &&
      task.originalUserId && task.originalUserId !== parseInt(userId) &&
      task.isEscalated === true &&
      task.status === 'closed'
    );
    const receivedEscalated = receivedEscalatedTasks.length;
    const receivedEscalatedCredits = receivedEscalated * 0.5;

    // 5. Multi-user SR-ID tasks (shared credit calculation)
    // Get all closed tasks with SR-IDs
    const closedTasksWithSrId = allUserTasks.filter(task =>
      task.srId && 
      task.status === 'closed' &&
      !task.isEscalated && // Don't double count escalated tasks
      task.userId === parseInt(userId)
    );

    let sharedCredits = 0;
    let sharedTasksCount = 0;

    if (closedTasksWithSrId.length > 0) {
      // PERFORMANCE OPTIMIZATION: Batch query instead of N+1 queries
      // Get all unique SR-IDs
      const uniqueSrIds = [...new Set(closedTasksWithSrId.map(task => 
        task.srId.toUpperCase().trim()
      ))];

      // Get user counts for ALL SR-IDs in ONE query
      const srIdUserCounts = await DailyTask.findAll({
        where: {
          srId: { [Op.in]: uniqueSrIds },
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
        },
        attributes: [
          'srId',
          [fn('COUNT', fn('DISTINCT', col('userId'))), 'userCount']
        ],
        group: ['srId'],
        raw: true
      });

      // Build a map for O(1) lookups
      const srIdMap = new Map();
      srIdUserCounts.forEach(row => {
        srIdMap.set(row.srId.toUpperCase().trim(), parseInt(row.userCount));
      });

      // Process each unique SR-ID
      const processedSrIds = new Set();
      for (const task of closedTasksWithSrId) {
        const normalizedSrId = task.srId.toUpperCase().trim();
        
        if (!processedSrIds.has(normalizedSrId)) {
          processedSrIds.add(normalizedSrId);
          
          const usersOnThisSrId = srIdMap.get(normalizedSrId) || 1;

          if (usersOnThisSrId > 1) {
            // This is a multi-user SR-ID - shared credit
            const creditShare = 1.0 / usersOnThisSrId;
            sharedCredits += creditShare;
            sharedTasksCount++;
          }
        }
      }
    }

    // Adjust direct credits to exclude multi-user tasks (they're counted in sharedCredits)
    const adjustedDirectCompleted = directCompleted - sharedTasksCount;
    const adjustedDirectCredits = adjustedDirectCompleted * 1.0;

    // Calculate total credits
    const totalCredits = adjustedDirectCredits + sharedCredits + escalatedAwayCredits + receivedEscalatedCredits;

    // Count status for display (Note: DB only has 'in-progress' and 'closed')
    const inProgress = allUserTasks.filter(task => task.status === 'in-progress').length;
    const closed = allUserTasks.filter(task => task.status === 'closed').length;
    const escalated = allUserTasks.filter(task => task.isEscalated === true).length;

    // Calculate performance metrics
    const completionRate = total > 0 ? ((totalCredits / total) * 100).toFixed(2) : "0.00";

    res.json({
      total,
      closed,
      inProgress,
      escalated,
      completionRate,
      // Breakdown for display
      breakdown: {
        directCompleted: adjustedDirectCompleted,
        directCredits: parseFloat(adjustedDirectCredits.toFixed(2)),
        sharedTasks: sharedTasksCount,
        sharedCredits: parseFloat(sharedCredits.toFixed(2)),
        escalatedAway: escalatedAway,
        escalatedAwayCredits: parseFloat(escalatedAwayCredits.toFixed(2)),
        receivedEscalated: receivedEscalated,
        receivedEscalatedCredits: parseFloat(receivedEscalatedCredits.toFixed(2)),
        totalCredits: parseFloat(totalCredits.toFixed(2))
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
    
    // Build date filter (use UTC for timezone consistency)
    let dateFilter = {};
    if (year && month) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (year) {
      const startDate = new Date(Date.UTC(year, 0, 1));
      const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      dateFilter = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else if (dateFrom && dateTo) {
      dateFilter = {
        [Op.gte]: new Date(dateFrom),
        [Op.lte]: new Date(dateTo)
      };
    }

    console.log('KPI Query filters:', { year, month, dateFrom, dateTo, dateFilter });

    // Get all users who have tasks
    const allUsers = await User.findAll({
      include: [{
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }],
      attributes: ['id', 'name', 'email']
    });

    // Get all tasks for the date range
    const allTasks = await DailyTask.findAll({
      where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
      attributes: ['id', 'srId', 'status', 'isEscalated', 'userId', 'originalUserId']
    });

    // Calculate KPI for each user
    const formattedStats = await Promise.all(allUsers.map(async (user) => {
      const userId = user.id;

      // Get all tasks for this user (including those they originally owned)
      const userTasks = allTasks.filter(task =>
        task.userId === userId || task.originalUserId === userId
      );

      if (userTasks.length === 0) {
        // Skip users with no tasks
        return null;
      }

      const total = userTasks.length;

      // 1. Direct completions (not escalated)
      const directCompletedTasks = userTasks.filter(task =>
        task.userId === userId &&
        task.status === 'closed' &&
        !task.isEscalated
      );

      // 2. Escalated away (completed by someone else)
      const escalatedAwayTasks = userTasks.filter(task =>
        task.originalUserId === userId &&
        task.userId !== userId &&
        task.isEscalated === true &&
        task.status === 'closed'
      );
      const escalatedAwayCredits = escalatedAwayTasks.length * 0.5;

      // 3. Received escalated (completed)
      const receivedEscalatedTasks = userTasks.filter(task =>
        task.userId === userId &&
        task.originalUserId && task.originalUserId !== userId &&
        task.isEscalated === true &&
        task.status === 'closed'
      );
      const receivedEscalatedCredits = receivedEscalatedTasks.length * 0.5;

      // 4. Multi-user SR-ID tasks (shared credit)
      const closedTasksWithSrId = directCompletedTasks.filter(task => task.srId);
      let sharedCredits = 0;
      let sharedTasksCount = 0;

      if (closedTasksWithSrId.length > 0) {
        // PERFORMANCE OPTIMIZATION: Pre-calculate SR-ID user counts
        // Build a map of SR-ID to user count for all tasks (do this once)
        const srIdUserCountMap = new Map();
        
        allTasks.forEach(task => {
          if (task.srId) {
            const normalizedSrId = task.srId.toUpperCase().trim();
            if (!srIdUserCountMap.has(normalizedSrId)) {
              srIdUserCountMap.set(normalizedSrId, new Set());
            }
            srIdUserCountMap.get(normalizedSrId).add(task.userId);
          }
        });

        // Convert Set sizes to actual counts
        const srIdCounts = new Map();
        srIdUserCountMap.forEach((userSet, srId) => {
          srIdCounts.set(srId, userSet.size);
        });

        // Process each unique SR-ID for this user
        const processedSrIds = new Set();
        for (const task of closedTasksWithSrId) {
          const normalizedSrId = task.srId.toUpperCase().trim();
          
          if (!processedSrIds.has(normalizedSrId)) {
            processedSrIds.add(normalizedSrId);

            const usersOnThisSrId = srIdCounts.get(normalizedSrId) || 1;

            if (usersOnThisSrId > 1) {
              // Multi-user SR-ID - shared credit
              const creditShare = 1.0 / usersOnThisSrId;
              sharedCredits += creditShare;
              sharedTasksCount++;
            }
          }
        }
      }

      // Adjust direct credits (exclude multi-user tasks)
      const adjustedDirectCompleted = directCompletedTasks.length - sharedTasksCount;
      const adjustedDirectCredits = adjustedDirectCompleted * 1.0;

      // Calculate total credits
      const totalCredits = adjustedDirectCredits + sharedCredits + escalatedAwayCredits + receivedEscalatedCredits;

      // Count statuses (Note: DB only has 'in-progress' and 'closed')
      const closed = userTasks.filter(task => task.status === 'closed').length;
      const inProgress = userTasks.filter(task => task.status === 'in-progress').length;
      const escalated = userTasks.filter(task => task.isEscalated === true).length;

      // Calculate completion rate
      const completionRate = total > 0 ? parseFloat(((totalCredits / total) * 100).toFixed(2)) : 0;

      return {
        userId: userId,
        userName: user.name || 'Unknown User',
        userEmail: user.email || 'No email',
        department: user.department?.name || 'N/A',
        total,
        closed,
        inProgress,
        escalated,
        completionRate,
        // Breakdown for display
        breakdown: {
          directCompleted: adjustedDirectCompleted,
          directCredits: parseFloat(adjustedDirectCredits.toFixed(2)),
          sharedTasks: sharedTasksCount,
          sharedCredits: parseFloat(sharedCredits.toFixed(2)),
          escalatedAway: escalatedAwayTasks.length,
          escalatedAwayCredits: parseFloat(escalatedAwayCredits.toFixed(2)),
          receivedEscalated: receivedEscalatedTasks.length,
          receivedEscalatedCredits: parseFloat(receivedEscalatedCredits.toFixed(2)),
          totalCredits: parseFloat(totalCredits.toFixed(2))
        }
      };
    }));

    // Filter out null entries (users with no tasks)
    const filteredStats = formattedStats.filter(stat => stat !== null);

    console.log('Formatted KPI stats with breakdown:', filteredStats);
    res.json(filteredStats);

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

    // Verify the requesting user is the original user
    if (currentTask.originalUserId !== req.user.id) {
      return res.status(403).json({ 
        error: "Permission denied", 
        message: "Only the original user who escalated the task can roll it back" 
      });
    }

    // Check if task is already completed
    if (currentTask.status === 'closed') {
      return res.status(403).json({ 
        error: "Cannot rollback task", 
        message: "Cannot rollback a completed task. The escalated user has finished the work." 
      });
    }

    // Check if escalated user has done any work (added progress)
    const progressByEscalatedUser = await TaskProgress.count({
      where: { 
        taskId: id, 
        userId: currentTask.userId // Current assignee (escalated user)
      }
    });

    if (progressByEscalatedUser > 0) {
      return res.status(403).json({ 
        error: "Cannot rollback task", 
        message: `The escalated user has already added ${progressByEscalatedUser} progress update(s). Rollback is not allowed once work has started.` 
      });
    }

    // Rollback the escalation
    const updateData = {
      escalatedToId: null,
      escalatedById: null,
      escalatedAt: null,
      escalationReason: '',
      isEscalated: false,
      // Restore original user
      userId: currentTask.originalUserId
      // Keep originalUserId to preserve escalation history for future analytics
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

// Add progress update to a task
const addTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, progressDescription } = req.body;
    const userId = req.user.id;

    console.log('📝 Adding task progress:', { taskId: id, userId, date, progressDescription: progressDescription?.substring(0, 50) });

    // Validate required fields
    if (!progressDescription || !progressDescription.trim()) {
      console.log('❌ Validation failed: Progress description is required');
      return res.status(400).json({ error: "Progress description is required" });
    }

    // Check if task exists
    const task = await DailyTask.findByPk(id);
    if (!task) {
      console.log('❌ Task not found:', id);
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if user is authorized (task owner or assigned user)
    // Convert to numbers for comparison since userId might be string from JWT
    const userIdNum = parseInt(userId);
    console.log('🔐 Authorization check:', { taskUserId: task.userId, escalatedToId: task.escalatedToId, userIdNum, role: req.user.role });
    if (task.userId !== userIdNum && task.escalatedToId !== userIdNum && req.user.role !== 'admin') {
      console.log('❌ Authorization failed');
      return res.status(403).json({ error: "Not authorized to update this task" });
    }

    // Create progress entry
    console.log('💾 Creating progress entry...');
    const progress = await TaskProgress.create({
      taskId: id,
      date: date || new Date(),
      progressDescription: progressDescription.trim(),
      userId: userIdNum
    });
    console.log('✅ Progress created:', progress.id);

    // Fetch the progress with user details
    const progressWithUser = await TaskProgress.findByPk(progress.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    console.log('✅ Progress with user details fetched');

    // Emit real-time update
    emitTaskUpdate(req, 'task-progress-added', {
      taskId: id,
      progress: progressWithUser
    });

    console.log('✅ Progress update completed successfully');
    res.status(201).json(progressWithUser);
  } catch (error) {
    console.error("❌ Error adding task progress:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ error: error.message || "Failed to add task progress" });
  }
};

// Get progress history for a task
const getTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const task = await DailyTask.findByPk(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Get all progress entries for the task
    const progressHistory = await TaskProgress.findAll({
      where: { taskId: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(progressHistory);
  } catch (error) {
    console.error("Error fetching task progress:", error);
    res.status(500).json({ error: "Failed to fetch task progress" });
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
  addTaskProgress,
  getTaskProgress,
};