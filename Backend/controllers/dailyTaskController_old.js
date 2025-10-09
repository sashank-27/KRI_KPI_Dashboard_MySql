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
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    // Use the current user's department (ObjectId)
    let department = currentUser.department;
    
    // Debug logging
    console.log("Current user:", {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
      department: department
    });
    
    // Validate that user has a department (required for non-superadmin users)
    if (!department && currentUser.role !== "superadmin") {
      return res.status(400).json({ error: "User must be assigned to a department to create daily tasks" });
    }
    
    // For superadmin users, we need to handle the case where they might not have a department
    // In this case, we'll need to get a default department or require them to specify one
    if (!department && currentUser.role === "superadmin") {
      // Try to get the first available department
      const Department = require("../models/Department");
      const defaultDept = await Department.findOne();
      if (!defaultDept) {
        return res.status(400).json({ error: "No departments available. Please create a department first." });
      }
      department = defaultDept.id;
    }

    // Create new daily task
    const taskData = {
      task,
      srId,
      remarks,
      status,
      date: date ? new Date(date) : new Date(),
      user: req.user.id, // Use the authenticated user's ID
      department, // Use the current user's department
      tags: Array.isArray(tags) ? tags : [],
      createdBy: req.user.id,
      originalUser: req.user.id, // Set original user for escalation tracking
    };
    
    console.log("Creating task with data:", taskData);
    
    const newTask = new DailyTask(taskData);

    const savedTask = await newTask.save();
    
    // Populate the response
    const populatedTask = await DailyTask.findById(savedTask.id)
      .populate("user", "name email")
      .populate("department", "name")
      .populate("createdBy", "name email");

    // Emit real-time update
    emitTaskUpdate(req, 'new-task', populatedTask);

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error("Error creating daily task:", error);
    res.status(500).json({ error: "Failed to create daily task" });
  }
};

// Update daily task
const updateDailyTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const updatedTask = await DailyTask.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("user", "name email")
      .populate("department", "name")
      .populate("createdBy", "name email");

    if (!updatedTask) {
      return res.status(404).json({ error: "Daily task not found" });
    }

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

    const deletedTask = await DailyTask.findByIdAndDelete(id);

    if (!deletedTask) {
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

    const updatedTask = await DailyTask.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("user", "name email")
      .populate("department", "name")
      .populate("createdBy", "name email");

    if (!updatedTask) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    // Emit real-time update
    emitTaskUpdate(req, 'task-status-updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating daily task status:", error);
    res.status(500).json({ error: "Failed to update daily task status" });
  }
};

// Get daily task statistics
const getDailyTaskStats = async (req, res) => {
  try {
    const { dateFrom, dateTo, department, user } = req.query;
    
    const matchQuery = {};
    
    if (dateFrom || dateTo) {
      matchQuery.date = {};
      if (dateFrom) matchQuery.date.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.date.$lte = new Date(dateTo);
    }
    
    if (department) matchQuery.department = department;
    if (user) matchQuery.user = user;
    
    const stats = await DailyTask.aggregate([
      { $match: matchQuery },
      {
        $group: {
          id: null,
          total: { $sum: 1 },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        }
      }
    ]);

    // Get escalated count
    const escalatedCount = await DailyTask.countDocuments({
      ...matchQuery,
      isEscalated: true
    });

    const result = {
      total: stats[0]?.total || 0,
      inProgress: stats[0]?.inProgress || 0,
      closed: stats[0]?.closed || 0,
      escalated: escalatedCount || 0
    };
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching daily task statistics:", error);
    res.status(500).json({ error: "Failed to fetch daily task statistics" });
  }
};

// Escalate task to another user
const escalateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalatedTo, escalationReason } = req.body;

    if (!escalatedTo) {
      return res.status(400).json({ error: "Escalated user is required" });
    }

    // Check if the task exists and belongs to the current user
    const task = await DailyTask.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    // Check if the task belongs to the current user
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only escalate your own tasks" });
    }

    // Check if the task is already escalated
    if (task.isEscalated) {
      return res.status(400).json({ error: "Task is already escalated" });
    }

    // Verify the escalated user exists
    const escalatedUser = await User.findById(escalatedTo);
    if (!escalatedUser) {
      return res.status(400).json({ error: "Escalated user not found" });
    }

    // Update the task with escalation details
    const updatedTask = await DailyTask.findByIdAndUpdate(
      id,
      {
        escalatedTo,
        escalatedBy: req.user.id,
        escalatedAt: new Date(),
        escalationReason: escalationReason || "",
        isEscalated: true,
        originalUser: task.user, // Store the original user before transfer
        user: escalatedTo, // Transfer ownership to escalated user
      },
      { new: true, runValidators: true }
    )
      .populate("user", "name email")
      .populate("department", "name")
      .populate("createdBy", "name email")
      .populate("escalatedTo", "name email")
      .populate("escalatedBy", "name email")
      .populate("originalUser", "name email");

    // Emit real-time update
    emitTaskUpdate(req, 'task-escalated', updatedTask);
    
    // Also emit to the escalated user specifically
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${escalatedTo}`).emit('task-assigned', {
        type: 'task-escalated',
        task: updatedTask,
        timestamp: new Date(),
        message: `Task escalated to you: ${updatedTask.task || 'Untitled task'}`
      });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error escalating task:", error);
    res.status(500).json({ error: "Failed to escalate task" });
  }
};

// Rollback escalated task
const rollbackTask = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the task exists
    const task = await DailyTask.findById(id);
    if (!task) {
      return res.status(404).json({ error: "Daily task not found" });
    }

    // Check if the task is escalated and the current user is the original user
    if (!task.isEscalated) {
      return res.status(400).json({ error: "Task is not escalated" });
    }

    // Handle legacy tasks that might not have originalUser set
    // If originalUser is not set, use escalatedBy as fallback
    const originalUserId = task.originalUser || task.escalatedBy;
    
    if (!originalUserId) {
      return res.status(400).json({ error: "Cannot determine original user for this task" });
    }

    if (originalUserId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the original user can rollback this task" });
    }

    // Rollback the task to the original user
    const updatedTask = await DailyTask.findByIdAndUpdate(
      id,
      {
        user: originalUserId, // Use the determined original user ID
        escalatedTo: null,
        escalatedBy: null,
        escalatedAt: null,
        escalationReason: "",
        isEscalated: false,
        // Don't clear originalUser - keep it for audit trail
      },
      { new: true, runValidators: true }
    )
      .populate("user", "name email")
      .populate("department", "name")
      .populate("createdBy", "name email")
      .populate("originalUser", "name email");

    // Emit real-time update
    emitTaskUpdate(req, 'task-rollback', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error("Error rolling back task:", error);
    res.status(500).json({ error: "Failed to rollback task" });
  }
};

// Get escalated tasks for a user
const getEscalatedTasks = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    
    const query = { 
      escalatedTo: userId,
      isEscalated: true 
    };
    
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    
    const tasks = await DailyTask.find(query)
      .populate({
        path: "user",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "department",
        select: "name",
        model: "Department"
      })
      .populate({
        path: "createdBy",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "escalatedTo",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "escalatedBy",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "originalUser",
        select: "name email",
        model: "User"
      })
      .sort({ escalatedAt: -1, date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DailyTask.countDocuments(query);

    // Debug logging
    console.log("Escalated tasks data:", JSON.stringify(tasks, null, 2));

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
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
    
    const query = { 
      escalatedBy: userId,
      isEscalated: true 
    };
    
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    
    const tasks = await DailyTask.find(query)
      .populate({
        path: "user",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "department",
        select: "name",
        model: "Department"
      })
      .populate({
        path: "createdBy",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "escalatedTo",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "escalatedBy",
        select: "name email",
        model: "User"
      })
      .populate({
        path: "originalUser",
        select: "name email",
        model: "User"
      })
      .sort({ escalatedAt: -1, date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DailyTask.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
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
    
    let matchQuery = { user: userId };
    
    // Handle date filtering
    if (year && month) {
      // Specific month and year
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      matchQuery.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      // Entire year
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      matchQuery.date = { $gte: startDate, $lte: endDate };
    } else if (dateFrom || dateTo) {
      // Custom date range
      matchQuery.date = {};
      if (dateFrom) matchQuery.date.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.date.$lte = new Date(dateTo);
    }
    
    const stats = await DailyTask.aggregate([
      { $match: matchQuery },
      {
        $group: {
          id: null,
          total: { $sum: 1 },
          closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } }
        }
      }
    ]);

    // Get escalated count separately
    const escalatedCount = await DailyTask.countDocuments({
      escalatedBy: new mongoose.Types.ObjectId(userId),
      isEscalated: true,
      ...matchQuery
    });

    const result = {
      total: stats[0]?.total || 0,
      closed: stats[0]?.closed || 0,
      inProgress: stats[0]?.inProgress || 0,
      escalated: escalatedCount || 0
    };
    
    // Calculate Open and Pending according to your specification
    // Open = Total - Closed (tasks that are not closed)
    // Pending = In Progress (tasks that are in progress)
    const open = result.total - result.closed;
    const pending = result.inProgress;

    const kpiData = {
      total: result.total,
      closed: result.closed,
      open: open,
      pending: pending,
      escalated: result.escalated,
      // KPI % (Closed/Total)
      completionRate: result.total > 0 ? ((result.closed / result.total) * 100).toFixed(2) : 0,
      // KPI % (Penalized) = ((Closed - Escalated) / Total) * 100
      penalizedRate: result.total > 0 ? (((result.closed - result.escalated) / result.total) * 100).toFixed(2) : 0
    };
    
    res.json(kpiData);
  } catch (error) {
    console.error("Error fetching user KPI data:", error);
    res.status(500).json({ error: "Failed to fetch user KPI data" });
  }
};

// Get KPI data for all users
const getAllUsersKPIData = async (req, res) => {
  try {
    const { year, month, dateFrom, dateTo } = req.query;
    
    let matchQuery = {};
    
    // Handle date filtering
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      matchQuery.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      matchQuery.date = { $gte: startDate, $lte: endDate };
    } else if (dateFrom || dateTo) {
      matchQuery.date = {};
      if (dateFrom) matchQuery.date.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.date.$lte = new Date(dateTo);
    }
    
    const stats = await DailyTask.aggregate([
      { $match: matchQuery },
      {
        $group: {
          id: "$user",
          total: { $sum: 1 },
          closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "id",
          foreignField: "id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $lookup: {
          from: "departments",
          localField: "userInfo.department",
          foreignField: "id",
          as: "departmentInfo"
        }
      },
      {
        $unwind: {
          path: "$departmentInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "dailytasks",
          let: { userId: "$id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$escalatedBy", "$$userId"] },
                    { $eq: ["$isEscalated", true] }
                  ]
                }
              }
            },
            {
              $count: "escalated"
            }
          ],
          as: "escalatedTasks"
        }
      },
      {
        $project: {
          userId: "$id",
          userName: "$userInfo.name",
          userEmail: "$userInfo.email",
          department: { $ifNull: ["$departmentInfo.name", "No Department"] },
          total: 1,
          closed: 1,
          open: { $subtract: ["$total", "$closed"] }, // Open = Total - Closed
          pending: "$inProgress", // Pending = In Progress
          escalated: { $ifNull: [{ $arrayElemAt: ["$escalatedTasks.escalated", 0] }, 0] },
          completionRate: {
            $cond: [
              { $gt: ["$total", 0] },
              { $multiply: [{ $divide: ["$closed", "$total"] }, 100] },
              0
            ]
          },
          penalizedRate: {
            $cond: [
              { $gt: ["$total", 0] },
              { $multiply: [{ $divide: [{ $subtract: ["$closed", { $ifNull: [{ $arrayElemAt: ["$escalatedTasks.escalated", 0] }, 0] }] }, "$total"] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { completionRate: -1 }
      }
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching all users KPI data:", error);
    res.status(500).json({ error: "Failed to fetch all users KPI data" });
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
};
