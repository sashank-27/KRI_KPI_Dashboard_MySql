const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/dailyTaskController");
const { authMiddleware } = require("../middleware");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/daily-tasks - Get all daily tasks with pagination and filters
router.get("/", getAllDailyTasks);

// GET /api/daily-tasks/stats - Get daily task statistics
router.get("/stats", getDailyTaskStats);

// KPI routes
// GET /api/daily-tasks/kpi/user/:userId - Get KPI data for a specific user
router.get("/kpi/user/:userId", getUserKPIData);

// GET /api/daily-tasks/kpi/all - Get KPI data for all users
router.get("/kpi/all", getAllUsersKPIData);

// GET /api/daily-tasks/:id - Get daily task by ID
router.get("/:id", getDailyTaskById);

// GET /api/daily-tasks/user/:userId - Get daily tasks by user
router.get("/user/:userId", getDailyTasksByUser);

// POST /api/daily-tasks - Create new daily task
router.post("/", createDailyTask);

// PUT /api/daily-tasks/:id - Update daily task
router.put("/:id", updateDailyTask);

// PUT /api/daily-tasks/:id/status - Update daily task status
router.put("/:id/status", updateDailyTaskStatus);

// DELETE /api/daily-tasks/:id - Delete daily task
router.delete("/:id", deleteDailyTask);

// Escalation routes
// POST /api/daily-tasks/:id/escalate - Escalate task to another user
router.post("/:id/escalate", escalateTask);

// POST /api/daily-tasks/:id/rollback - Rollback escalated task
router.post("/:id/rollback", rollbackTask);

// GET /api/daily-tasks/escalated/:userId - Get escalated tasks for a user
router.get("/escalated/:userId", getEscalatedTasks);

// GET /api/daily-tasks/escalated-by/:userId - Get tasks escalated by a user
router.get("/escalated-by/:userId", getTasksEscalatedByUser);

module.exports = router;
