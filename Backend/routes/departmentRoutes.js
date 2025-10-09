const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/departmentController");
const { authMiddleware, adminMiddleware } = require("../middleware");

// Create department (admin only)
router.post("/", authMiddleware, adminMiddleware, departmentController.createDepartment);

// Get all departments (authenticated users)
router.get("/", authMiddleware, departmentController.getAllDepartments);

// Update department (admin only)
router.put("/:id", authMiddleware, adminMiddleware, departmentController.updateDepartment);

// Delete department (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, departmentController.deleteDepartment);

module.exports = router;
